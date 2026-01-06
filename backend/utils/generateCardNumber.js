// Generate a random 5-digit card number
const generateCardNumber = () => {
  return String(Math.floor(10000 + Math.random() * 90000));
};

// Generate confirmation code
const generateConfirmation = (prefix = 'SR') => {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${random}`;
};

module.exports = { generateCardNumber, generateConfirmation };
