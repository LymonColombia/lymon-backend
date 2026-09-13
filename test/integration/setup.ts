// ponytail: no globalSetup/teardown. Docker is started by hand (see the compose file
// header); this only gives specs room for the first connect.
jest.setTimeout(30_000);
