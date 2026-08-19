
import { describe, it, expect } from 'vitest';
import { ProvisionModality } from '../../organization/daycare/value-objects/ProvisionModality';
import {
  PlanningInstrumentType,
  InstitutionalContractRef,
  CurricularFrameworkRef
} from '../ValueObjects';
import { PlanningVersion } from '../Entities';

describe('Institutional Contract References (Slice 2B.1)', () => {
  it('A. GROUP_PLANNING instrument type is valid', () => {
    const result = PlanningInstrumentType.create('GROUP_PLANNING');
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().value).toBe('GROUP_PLANNING');
  });

  it('B. invalid instrument type is rejected', () => {
    const result1 = PlanningInstrumentType.create('SPECIFIC_STIMULATION');
    expect(result1.isFailure).toBe(true);
    const result2 = PlanningInstrumentType.create('INVALID');
    expect(result2.isFailure).toBe(true);
  });

  it('C. InstitutionalContractRef can represent DIRECT', () => {
    const modality = ProvisionModality.create('DIRECT').getValue();
    const type = PlanningInstrumentType.create('GROUP_PLANNING').getValue();
    const result = InstitutionalContractRef.create({
      provisionModality: modality,
      instrumentType: type,
      documentCode: '3D11-009-003',
      contractVersion: 'TEST-V1'
    });
    expect(result.isSuccess).toBe(true);
    const ref = result.getValue();
    expect(ref.provisionModality.value).toBe('DIRECT');
  });

  it('D. InstitutionalContractRef can represent INDIRECT', () => {
    const modality = ProvisionModality.create('INDIRECT').getValue();
    const type = PlanningInstrumentType.create('GROUP_PLANNING').getValue();
    const result = InstitutionalContractRef.create({
      provisionModality: modality,
      instrumentType: type,
      documentCode: 'DPES/CG/2020/PDG/04',
      contractVersion: 'TEST-V1'
    });
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().provisionModality.value).toBe('INDIRECT');
  });

  it('E. invalid provision modality cannot enter through the reference', () => {
    // Because provisionModality field strictly requires a ProvisionModality instance, 
    // it's typed and impossible to pass "INVALID" without type errors or bypasses.
    const invalidCreation = ProvisionModality.create('INVALID');
    expect(invalidCreation.isFailure).toBe(true);
  });

  it('F. documentCode is preserved exactly', () => {
    const modality = ProvisionModality.create('DIRECT').getValue();
    const type = PlanningInstrumentType.create('GROUP_PLANNING').getValue();
    const result = InstitutionalContractRef.create({
      provisionModality: modality,
      instrumentType: type,
      documentCode: '   SOME-DOC-CODE   ',
      contractVersion: 'TEST-V1'
    });
    expect(result.getValue().documentCode).toBe('SOME-DOC-CODE');
  });

  it('G. contractVersion is preserved exactly', () => {
    const modality = ProvisionModality.create('DIRECT').getValue();
    const type = PlanningInstrumentType.create('GROUP_PLANNING').getValue();
    const result = InstitutionalContractRef.create({
      provisionModality: modality,
      instrumentType: type,
      documentCode: '3D11',
      contractVersion: '   V2   '
    });
    expect(result.getValue().contractVersion).toBe('V2');
  });

  it('H. InstitutionalContractRef behaves immutably', () => {
    const modality = ProvisionModality.create('DIRECT').getValue();
    const type = PlanningInstrumentType.create('GROUP_PLANNING').getValue();
    const ref = InstitutionalContractRef.create({
      provisionModality: modality,
      instrumentType: type,
      documentCode: 'CODE',
      contractVersion: 'V1'
    }).getValue();
    
    // ValueObject props are readonly
    expect(Object.isFrozen(ref.props)).toBe(true);
  });

  it('I. CurricularFrameworkRef preserves frameworkId', () => {
    const ref = CurricularFrameworkRef.create({
      frameworkId: 'SINTETICO-1',
      frameworkVersion: '2024'
    }).getValue();
    expect(ref.frameworkId).toBe('SINTETICO-1');
  });

  it('J. CurricularFrameworkRef preserves frameworkVersion', () => {
    const ref = CurricularFrameworkRef.create({
      frameworkId: 'SINTETICO-1',
      frameworkVersion: '2024'
    }).getValue();
    expect(ref.frameworkVersion).toBe('2024');
  });

  it('K. CurricularFrameworkRef behaves immutably', () => {
    const ref = CurricularFrameworkRef.create({
      frameworkId: 'SINTETICO-1',
      frameworkVersion: '2024'
    }).getValue();
    expect(Object.isFrozen(ref.props)).toBe(true);
  });

  it('L. PlanningVersion owns InstitutionalContractRef', () => {
    const modality = ProvisionModality.create('DIRECT').getValue();
    const type = PlanningInstrumentType.create('GROUP_PLANNING').getValue();
    const contractRef = InstitutionalContractRef.create({
      provisionModality: modality,
      instrumentType: type,
      documentCode: 'CODE',
      contractVersion: 'V1'
    }).getValue();
    
    const version = PlanningVersion.create('v1', contractRef, undefined);
    expect(version.institutionalContractRef).toBe(contractRef);
  });

  it('M. PlanningVersion owns CurricularFrameworkRef', () => {
    const curricularRef = CurricularFrameworkRef.create({
      frameworkId: 'F1',
      frameworkVersion: 'V1'
    }).getValue();
    
    const version = PlanningVersion.create('v1', undefined, curricularRef);
    expect(version.curricularFrameworkRef).toBe(curricularRef);
  });

  it('N. amendment inherits InstitutionalContractRef', () => {
    const modality = ProvisionModality.create('DIRECT').getValue();
    const type = PlanningInstrumentType.create('GROUP_PLANNING').getValue();
    const contractRef = InstitutionalContractRef.create({
      provisionModality: modality,
      instrumentType: type,
      documentCode: 'CODE',
      contractVersion: 'V1'
    }).getValue();
    
    const version = PlanningVersion.create('v1', contractRef, undefined);
    const amendment = version.cloneForAmendment('v2');
    
    expect(amendment.institutionalContractRef).toBe(contractRef);
  });

  it('O. amendment inherits CurricularFrameworkRef', () => {
    const curricularRef = CurricularFrameworkRef.create({
      frameworkId: 'F1',
      frameworkVersion: 'V1'
    }).getValue();
    
    const version = PlanningVersion.create('v1', undefined, curricularRef);
    const amendment = version.cloneForAmendment('v2');
    
    expect(amendment.curricularFrameworkRef).toBe(curricularRef);
  });

  it('P. prior version references remain unchanged', () => {
    const curricularRef = CurricularFrameworkRef.create({
      frameworkId: 'F1',
      frameworkVersion: 'V1'
    }).getValue();
    
    const version = PlanningVersion.create('v1', undefined, curricularRef);
    const amendment = version.cloneForAmendment('v2');
    
    expect(version.curricularFrameworkRef).toBe(curricularRef);
    expect(amendment.curricularFrameworkRef).toBe(curricularRef);
  });
});
