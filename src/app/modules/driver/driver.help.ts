const axios = require('axios');
const dns = require('dns');

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRad = (angle: number): number => (angle * Math.PI) / 180;
  const R = 6371; // Radius of Earth in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// -----------------------------
const isValidEmailFormat = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const checkDomainHasMxRecords = async (domain: string): Promise<boolean> => {
  return new Promise(resolve => {
    dns.resolveMx(domain, (err: any, addresses: any) => {
      if (err) {
        resolve(false);
      } else {
        resolve(addresses.length > 0);
      }
    });
  });
};

// Function to validate email
const validateEmail = async (email: string): Promise<boolean> => {
  if (!isValidEmailFormat(email)) {
    return false;
  }
  const domain = email.split('@')[1];
  const hasMxRecords = await checkDomainHasMxRecords(domain);

  return hasMxRecords;
};

export { haversineDistance, validateEmail };
