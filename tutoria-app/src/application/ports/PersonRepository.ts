import { Person } from '../../domain/identity/person/Person';

export interface PersonRepository {
  findById(personId: string): Promise<Person | null>;
  save(person: Person): Promise<void>;
}
