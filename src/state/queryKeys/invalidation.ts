export type QueryInvalidateAction = {
  domain: 'auth' | 'clients' | 'tasks' | 'notices' | 'gst' | 'analytics' | 'tenant';
  key?: readonly unknown[];
};

export const queryInvalidation = {
  clients: { all: { domain: 'clients' } as QueryInvalidateAction },
  tasks: { all: { domain: 'tasks' } as QueryInvalidateAction },
  notices: { all: { domain: 'notices' } as QueryInvalidateAction },
};
