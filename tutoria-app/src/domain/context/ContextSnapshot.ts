import { ContextFragment } from './ContextFragment';
import { ContextScore } from './ContextScore';
import { ContextComponent, ContextComponentType } from './ContextComponent';

export class ContextSnapshot {
  constructor(
    public readonly id: string,
    public readonly timestamp: Date,
    public readonly components: readonly ContextComponent[],
    public readonly fragments: readonly ContextFragment[],
    public readonly score: ContextScore
  ) {
    // freeze to ensure immutability
    Object.freeze(this.components);
    Object.freeze(this.fragments);
  }

  public hasComponent(type: ContextComponentType): boolean {
    return this.components.some(c => c.type === type);
  }

  public getComponent<T>(type: ContextComponentType): ContextComponent<T> | undefined {
    return this.components.find(c => c.type === type) as ContextComponent<T> | undefined;
  }
}
