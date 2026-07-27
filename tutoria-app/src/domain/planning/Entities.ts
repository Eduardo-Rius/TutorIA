import { SystemClock } from '../../shared/kernel/Clock';
import { Entity } from '../../shared/kernel/Entity';
import { EntityId } from '../../shared/ids/EntityId';

// Temp generic id for internal entities until we have specific ones
class InternalEntityId extends EntityId {
  private constructor(id: string) { super(id); }
  public static create(): InternalEntityId {
    return new InternalEntityId(crypto.randomUUID());
  }
}

export interface ActivityProps {
  title: string;
  description: string;
  durationMinutes: number;
  resources: string[];
}

export class Activity extends Entity<InternalEntityId> {
  constructor(
    id: InternalEntityId,
    public title: string,
    public description: string,
    public durationMinutes: number,
    public resources: string[]
  ) {
    super(id);
  }

  public static create(props: ActivityProps): Activity {
    return new Activity(
      InternalEntityId.create(),
      props.title,
      props.description,
      props.durationMinutes,
      props.resources
    );
  }
}

export interface PlanningIntentProps {
  goal: string;
  expectedLearnings: string[];
}

export class PlanningIntent extends Entity<InternalEntityId> {
  private _activities: Activity[] = [];

  constructor(
    id: InternalEntityId,
    public goal: string,
    public expectedLearnings: string[],
    activities?: Activity[]
  ) {
    super(id);
    if (activities) {
      this._activities = activities;
    }
  }

  public static create(props: PlanningIntentProps): PlanningIntent {
    return new PlanningIntent(InternalEntityId.create(), props.goal, props.expectedLearnings);
  }

  get activities(): ReadonlyArray<Activity> {
    return this._activities;
  }

  public addActivity(activity: Activity) {
    this._activities.push(activity);
  }
}

export class PlanningVersion {
  private _intents: PlanningIntent[];

  constructor(
    public readonly versionId: string,
    intents: PlanningIntent[],
    public readonly createdAt: Date
  ) {
    this._intents = intents;
  }

  public static create(versionId: string): PlanningVersion {
    return new PlanningVersion(versionId, [], new SystemClock().now());
  }

  get intents(): ReadonlyArray<PlanningIntent> {
    return this._intents;
  }

  public addIntent(intent: PlanningIntent) {
    this._intents.push(intent);
  }

  public cloneForAmendment(newVersionId: string): PlanningVersion {
    return new PlanningVersion(newVersionId, [...this._intents], new SystemClock().now());
  }
}
