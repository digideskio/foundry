// Load in dependencies
var expect = require('chai').expect;
var quote = require('shell-quote').quote;
var WritableStreamBuffer = require('stream-buffers').WritableStreamBuffer;
var childUtils = require('./utils/child-process');
var Foundry = require('../');

// Define our test constants
var foundryCmd = __dirname + '/../bin/foundry';

// Start our tests
describe('foundry', function () {
  describe('releasing a new package', function () {
    childUtils.addToPath(__dirname + '/test-files/foundry-release-echo/');
    before(function releaseNewPackage (done) {
      this.stdout = new WritableStreamBuffer();
      var release = new Foundry.Release(['foundry-release-echo'], {
        stdout: this.stdout,
        color: false
      });
      release.release('1.0.0', done);
    });
    before(function processOutput () {
      this.output = this.stdout.getContents().toString();
    });
    after(function cleanup () {
      delete this.output;
      delete this.stdout;
    });

    // Verify we are meeting our spec
    it('updates the package files', function () {
      expect(this.output).to.contain('Step run (echo): update-files 1.0.0 Release 1.0.0');
    });
    it('commits the updates', function () {
      expect(this.output).to.contain('Step run (echo): commit 1.0.0 Release 1.0.0');
    });
    it('registers the package', function () {
      expect(this.output).to.contain('Step run (echo): register 1.0.0 Release 1.0.0');
    });
    it('publishes the package', function () {
      expect(this.output).to.contain('Step run (echo): publish 1.0.0 Release 1.0.0');
    });
    it('calls our steps in order', function () {
      expect(this.output.replace(/\n/g, ' ')).to.match(/update-files.*commit.*register.*publish/);
    });

    // Verify we are being nice to our users =)
    it('provides the user with semantic step info', function () {
      expect(this.output).to.contain('FOUNDRY_VERSION: 1.0.0');
      expect(this.output).to.contain('FOUNDRY_MESSAGE: Release 1.0.0');
      expect(this.output).to.contain(
        'Running step: foundry-release-echo update-files "$FOUNDRY_VERSION" "$FOUNDRY_MESSAGE"');
    });
  });

  describe('releasing an existing package', function () {
    childUtils.addToPath(__dirname + '/test-files/foundry-release-echo/');
    before(function releaseExistingPackage (done) {
      this.stdout = new WritableStreamBuffer();
      var release = new Foundry.Release(['foundry-release-echo'], {
        stdout: this.stdout
      });
      release.release('1.2.0', done);
    });
    after(function cleanup () {
      delete this.stdout;
    });

    it('updates the package files', function () {
      expect(this.stdout.getContents().toString()).to.contain('update-files');
    });

    it('does not register the package', function () {
      expect(this.stdout.getContents().toString()).to.not.contain('register');
    });
  });
});

describe('foundry', function () {
  describe.only('releasing with an `releaseCommand` object', function () {
    childUtils.addToPath(__dirname + '/test-files/foundry-release-echo/');
    before(function releaseExistingPackage (done) {
      this.stdout = new WritableStreamBuffer();
      var release = new Foundry.Release([{
        type: 'releaseCommand',
        command: 'foundry-release-echo'
      }], {
        stdout: this.stdout
      });
      release.release('1.0.0', done);
    });
    after(function cleanup () {
      delete this.stdout;
    });

    it('runs each of the release command steps', function () {
      var output = this.stdout.getContents().toString();
      expect(output.replace(/\n/g, ' ')).to.match(/update-files.*commit.*register.*publish/);
    });
  });

  describe.skip('releasing with an `customCommand` object', function () {
    it('runs the command\'s specific steps', function () {

    });
  });
});

describe('foundry listing its commands', function () {
  childUtils.exec(quote(['node', foundryCmd, 'commands']));

  it('lists all its commands', function () {
    expect(this.err).to.equal(null);
    expect(this.stdout).to.contain('foundry-release-echo@1.0.0');
  });
});

describe.skip('foundry releasing an echoing plugin', function () {
  describe.skip('for the first time', function () {
    // TODO: Move to `1.0.0` as default in support of more logical semvers
    childUtils.exec(quote(['node', foundryCmd, 'release', '1.0.0']));

    it('updates files, commits, registers, and publishes', function () {
      expect(this.err).to.equal(null);
      expect(this.stdout).to.contain([
        'updateFiles occurred',
        'commit occurred',
        'register occurred',
        'publish occurred',
      ].join('\n'));
    });
  });

  describe.skip('for a second time', function () {
    childUtils.exec(quote(['node', foundryCmd, 'release', '1.1.0']));

    it('updates files, commits, and publishes', function () {
      expect(this.err).to.equal(null);
      expect(this.stdout).to.contain([
        'updateFiles occurred',
        'commit occurred',
        'publish occurred',
      ].join('\n'));
    });

    it('does not register', function () {
      expect(this.err).to.equal(null);
      expect(this.stdout).to.not.contain('register');
    });
  });
});

// DEV: This is not a required test but one for peace of mind regarding usability messaing
describe.skip('foundry using a package with a bad `specVersion`', function () {
  childUtils.exec(quote(['node', foundryCmd,
    '--plugin-dir', __dirname + '/test-files/plugins-unsupported-version/',
    'release', '1.0.0']));

  it('notifies the user of the package name', function () {
    expect(this.err).to.not.equal(null);
    expect(this.err.message).to.contain('Actual: "1.0.0". `support-not-found.specVersion` is below the required semver for `foundry`. Please install a supported version.');
  });
});
