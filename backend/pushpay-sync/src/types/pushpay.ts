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
  };

  family_position?: string;

  phones?: {
    phone?: PushpayPhoneNumber[];
  };

  user_defined_text_fields?: {
    user_defined_text_field?: PushpayTextField[];
  };

  user_defined_pulldown_fields?: {
    user_defined_pulldown_field?: PushpayPulldownField[];
  };
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
