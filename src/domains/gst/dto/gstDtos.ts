export type GSTSnapshotRequestDto = {
  firmId: string;
  selectedClientId?: string | null;
  selectedGSTIN?: string | null;
  selectedPeriod?: string | null;
};
