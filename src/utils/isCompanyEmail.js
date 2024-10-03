const isCompanyEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  // Sử dụng regex để kiểm tra email
  const companyDomain = /@fpt\.edu\.vn$/;
  return companyDomain.test(email.toLowerCase());
};

module.exports = isCompanyEmail;
