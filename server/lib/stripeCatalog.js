// server/lib/stripeCatalog.js
module.exports = {
  proProductId: process.env.STRIPE_PROD_ID, // e.g., prod_abc
  priceIds: new Set([
    process.env.STRIPE_PRICE_PRO_MONTHLY, // price_xxx
    process.env.STRIPE_PRICE_PRO_ANNUAL, // price_yyy
  ]),
};
