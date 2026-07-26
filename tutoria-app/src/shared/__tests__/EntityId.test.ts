import { describe, it, expect } from 'vitest';
import { TenantId } from '../value-objects/Ids';

describe('EntityId', () => {
  it('should reject empty ID', () => {
    const res = TenantId.create("");
    expect(res.isFailure).toBe(true);
    expect(res.error).toBe("ID cannot be empty");
  });

  it('should reject invalid UUID', () => {
    const res = TenantId.create("invalid-id");
    expect(res.isFailure).toBe(true);
    expect(res.error).toBe("Invalid UUID format");
  });

  it('should accept valid UUID', () => {
    const validUUID = "550e8400-e29b-41d4-a716-446655440000";
    const res = TenantId.create(validUUID);
    expect(res.isSuccess).toBe(true);
    expect(res.getValue().toString()).toBe(validUUID);
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
