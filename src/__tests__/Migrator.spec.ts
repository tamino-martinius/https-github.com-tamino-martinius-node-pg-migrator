import { context } from './types';
import {
  Connector,
  Migration,
  Migrator,
} from '..';

if (!process.env.PGDATABASE) process.env.PGDATABASE = 'testcode';

let lastMigrator: Migrator | undefined;
const migrator = () => {
  console.log('migrator');
  if (lastMigrator) lastMigrator.connector.disconnect();
  return lastMigrator = new Migrator(new Connector());
};

beforeAll(async () => {
  const connector = new Connector();
  await connector.createDatabase();
  await connector.disconnect();
});

afterAll(async () => {
  console.log('afterAll');
  if (lastMigrator) await lastMigrator.connector.disconnect();
  console.log('after disconnect');
  const connector = new Connector();
  await connector.dropDatabase();
  await connector.disconnect();
});

describe('Migrator', () => {
  describe('#migrate', () => {
    let migrations: Migration[] = [];
    const subject = () => migrator().migrate(migrations);

    it('does not throw error', async () => {
      expect(subject).not.toThrowError();
    });

    context('when migration is present', {
      definitions() {
        migrations = [
          {
            key: 'test-1',
            up: jest.fn(),
            down: jest.fn(),
          },
        ];
      },
      tests() {
        it('applies migration', async () => {
          const fn = migrations[0].up;
          await subject();
          expect(fn).toBeCalled();
        });
      },
    });

    context('when migration has invalid parent', {
      definitions() {
        migrations = [
          {
            parent: ['test-0'],
            key: 'test-1',
            up: jest.fn(),
            down: jest.fn(),
          },
        ];
      },
      tests() {
        it('throws error', async () => {
          try {
            await subject();
          } catch (error) {
            return expect(error).toBeDefined();
          }
          expect(false).toBeTruthy(); // not expected to reach
        });
      },
    });

    context('when migration throws error', {
      definitions() {
        migrations = [
          {
            key: 'test-1',
            up: () => { throw 'error'; },
            down: jest.fn(),
          },
        ];
      },
      tests() {
        it('throws error', async () => {
          try {
            await subject();
          } catch (error) {
            return expect(error).toBeDefined();
          }
          expect(false).toBeTruthy(); // not expected to reach
        });
      },
    });

    context('when migrations parent build infinite loop', {
      definitions() {
        migrations = [
          {
            parent: ['test-1'],
            key: 'test-0',
            up: jest.fn(),
            down: jest.fn(),
          },
          {
            parent: ['test-0'],
            key: 'test-1',
            up: jest.fn(),
            down: jest.fn(),
          },
        ];
      },
      tests() {
        it('throws error', async () => {
          try {
            await subject();
          } catch (error) {
            return expect(error).toBeDefined();
          }
          expect(false).toBeTruthy(); // not expected to reach
        });
      },
    });
  });

  describe('#up', () => {
    let migration: Migration = {
      key: 'test-1',
      up: jest.fn(),
      down: jest.fn(),
    };

    const subject = () => migrator().up(migration);

    it('does not throw error', async () => {
      expect(subject).not.toThrowError();
    });

    context('when migration is present', {
      definitions() {
        migration = {
          key: 'test-up-1',
          up: jest.fn(),
          down: jest.fn(),
        };
      },
      tests() {
        it('applies migration', async () => {
          const fn = migration.up;
          await subject();
          expect(fn).toBeCalled();
        });
      },
    });

    context('when migration has invalid parent', {
      definitions() {
        migration = {
          parent: ['test-0'],
          key: 'test-up-2',
          up: jest.fn(),
          down: jest.fn(),
        };
      },
      tests() {
        it('throws error', async () => {
          try {
            await subject();
          } catch (error) {
            return expect(error).toBeDefined();
          }
          expect(false).toBeTruthy(); // not expected to reach
        });
      },
    });

    context('when migration throws error', {
      definitions() {
        migration = {
          key: 'test-up-3',
          up: () => { throw 'error'; },
          down: jest.fn(),
        };
      },
      tests() {
        it.only('throws error', async () => {
          console.log('spec');
          try {
            await subject();
          } catch (error) {
            return expect(error).toBeDefined();
          }
          expect(false).toBeTruthy(); // not expected to reach
        });
      },
    });
  });
});