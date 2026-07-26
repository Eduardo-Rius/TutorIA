export interface Repository<TEntity, TId> {
  save(entity: TEntity): Promise<void>;
  findById(id: TId): Promise<TEntity | null>;
  exists(id: TId): Promise<boolean>;
}
