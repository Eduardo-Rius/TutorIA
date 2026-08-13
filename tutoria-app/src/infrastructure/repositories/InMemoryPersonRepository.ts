import { PersonRepository } from '../../application/ports/PersonRepository';
import { Person } from '../../domain/identity/person/Person';

export class InMemoryPersonRepository implements PersonRepository {
  private persons: Map<string, Person> = new Map();

  async findById(personId: string): Promise<Person | null> {
    const person = this.persons.get(personId);
    return person ? Person.reconstitute(person.props) : null;
  }

  async save(person: Person): Promise<void> {
    this.persons.set(person.personId, Person.reconstitute(person.props));
  }
}
