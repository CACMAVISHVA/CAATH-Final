export interface IBaseRepository<TEntity, TId = string> {
  findById(id: TId): Promise<TEntity | null>;
  create(payload: Partial<TEntity>): Promise<TEntity>;
  update(id: TId, payload: Partial<TEntity>): Promise<TEntity>;
  delete(id: TId): Promise<void>;
}
