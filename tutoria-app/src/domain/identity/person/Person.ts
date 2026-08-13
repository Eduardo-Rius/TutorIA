export interface PersonProps {
  id: string; // TutorIA canonical identity (UUID)
  firstName: string;
  lastName: string;
  createdAt: string; // ISO date string
}

export class Person {
  private constructor(public readonly props: PersonProps) {}

  public get personId(): string {
    return this.props.id;
  }

  public get firstName(): string {
    return this.props.firstName;
  }

  public get lastName(): string {
    return this.props.lastName;
  }

  public get displayName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  public get createdAt(): string {
    return this.props.createdAt;
  }

  public static create(props: Omit<PersonProps, 'id' | 'createdAt'>): Person {
    const normalizedProps = Person.normalize(props);

    if (!normalizedProps.firstName) {
      throw new Error('Person must have a non-empty firstName');
    }

    if (!normalizedProps.lastName) {
      throw new Error('Person must have a non-empty lastName');
    }

    return new Person({
      id: crypto.randomUUID(), // TutorIA-generated opaque UUID
      createdAt: new Date().toISOString(),
      ...normalizedProps,
    });
  }

  public static reconstitute(props: PersonProps): Person {
    return new Person(props);
  }

  private static normalize(props: Omit<PersonProps, 'id' | 'createdAt'>): Omit<PersonProps, 'id' | 'createdAt'> {
    return {
      firstName: (props.firstName || '').trim(),
      lastName: (props.lastName || '').trim(),
    };
  }
}
