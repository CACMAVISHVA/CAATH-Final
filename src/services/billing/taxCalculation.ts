import { GSTTreatment, PlaceOfSupply } from './invoiceTypes';

export const calculateInvoiceTax = (amount: number, gstRate: number, placeOfSupply: PlaceOfSupply, clientGstTreatment: GSTTreatment) => {
  if (clientGstTreatment === 'RCM' || clientGstTreatment === 'Export' || clientGstTreatment === 'SEZ') return { cgst: 0, sgst: 0, igst: 0 };
  const tax = (amount * gstRate) / 100;
  return placeOfSupply === 'Within State' ? { cgst: tax / 2, sgst: tax / 2, igst: 0 } : { cgst: 0, sgst: 0, igst: tax };
};
