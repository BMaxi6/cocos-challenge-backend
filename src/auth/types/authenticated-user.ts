export type AuthenticatedUser = {
  id: number;
  email: string;
  accountNumber: string;
};

export const REQUEST_USER_KEY = 'user' as const;
