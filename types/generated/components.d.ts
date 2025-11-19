import type { Schema, Struct } from '@strapi/strapi';

export interface QuoteQuotes extends Struct.ComponentSchema {
  collectionName: 'components_quote_quotes';
  info: {
    displayName: 'Quotes';
  };
  attributes: {
    Author: Schema.Attribute.String;
    Quote: Schema.Attribute.Text;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'quote.quotes': QuoteQuotes;
    }
  }
}
