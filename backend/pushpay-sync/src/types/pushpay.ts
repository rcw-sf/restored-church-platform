export interface PushpayIndividual {
  id: string;
  first_name: string;
  last_name: string;
  gender?: string;
  email?: string;
  birthday?: string;
  membership_date?: string;
  membership_end?: string;

  family?: {
    id: string;
    "#text"?: string;
  };

  family_position?: string;

  family_members: {
    family_member: PushpayFamilyMember[];
  };

  phones?: {
    phone?: PushpayPhoneNumber[];
  };

  user_defined_text_fields?: {
    user_defined_text_field?: PushpayTextField[];
  };

  user_defined_pulldown_fields?: {
    user_defined_pulldown_field?: PushpayPulldownField[];
  };

  created?: string;
  modified?: string;
}

export interface PushpayFamilyMember {
  individual?: Array<{
    id: string;
    "#text"?: string;
  }>;
  family_position?: string;
}

export interface PushpayPhoneNumber {
  "#text": string;
  type: string;
}

export interface PushpayTextField {
  label: string;
  text: {
    "#text": string;
  };
}

export interface PushpayPulldownField {
  name?: string;
  label: string;
  selection: {
    "#text": string;
    id: string;
  };
  admin_only?: boolean;
}

export interface PushpayAccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface PushpayPaymentAmount {
  amount: number;
  currency: string;
}

export type PaymentType = "Online" | "Check" | "Cash" | "Other";

export interface PushpayTransaction {
  transactionId: string;
  status: "Completed" | "Failed" | "Refunded";
  payer: {
    fullName: string;
    email: string;
  };
  communityMember?: {
    key: string;
  };
  amount: PushpayPaymentAmount;
  paymentMethodType: PaymentType;
  createdOn: string;
  givenOn?: string;
  refundedBy?: {
    transactionId: string;
  };
  externalLinks?: Array<{
    relationship: string;
    value: string;
  }>;
  fields?: Array<{
    label: string;
    value: string;
  }>;
  notes?: string;
  fund: {
    key: string;
    name: string;
  };
}

export interface PushpayPaymentsResponse {
  items: PushpayTransaction[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}
