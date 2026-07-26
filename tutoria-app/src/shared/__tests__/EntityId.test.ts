import { describe, it, expect } from 'vitest';
import { TenantId } from '../value-objects/Ids';
import { InvalidEntityIdError } from '../errors/InvalidEntityIdError';

describe('EntityId', () => {
  it('should reject empty ID via create', () => {
    const res = TenantId.create("");
    expect(res.isFailure).toBe(true);
    expect(res.error).toBeInstanceOf(InvalidEntityIdError);
  });

  it('should reject invalid UUID via create', () => {
    const res = TenantId.create("invalid-id");
    expect(res.isFailure).toBe(true);
    expect(res.error).toBeInstanceOf(InvalidEntityIdError);
  });

  it('should accept valid UUID via create', () => {
    const validUUID = "550e8400-e29b-41d4-a716-446655440000";
    const res = TenantId.create(validUUID);
    expect(res.isSuccess).toBe(true);
    expect(res.getValue().toString()).toBe(validUUID);
  });

  it('should reject invalid UUID via restore', () => {
    expect(() => TenantId.restore("invalid-id")).toThrowError(InvalidEntityIdError);
  });

  it('should accept valid UUID via restore', () => {
    const validUUID = "550e8400-e29b-41d4-a716-446655440000";
    const id = TenantId.restore(validUUID);
    expect(id.toString()).toBe(validUUID);
  });

  it('should be equal if IDs are identical', () => {
    const validUUID = "550e8400-e29b-41d4-a716-446655440000";
    const id1 = TenantId.create(validUUID).getValue();
    const id2 = TenantId.create(validUUID).getValue();
    expect(id1.equals(id2)).toBe(true);
  });

  it('should not be equal if IDs are different', () => {
    const id1 = TenantId.create("550e8400-e29b-41d4-a716-446655440000").getValue();
    const id2 = TenantId.create("550e8400-e29b-41d4-a716-446655440001").getValue();
    expect(id1.equals(id2)).toBe(false);
  });
});
