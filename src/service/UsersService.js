import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Transporter from '../utils/Transporter.js';
import otpGenerator from 'otp-generator';
import { Validation } from '../validation/Validation.js';
import { prismaClient } from '../app/Database.js';
import { ResponseError } from '../error/ResponseError.js';
import {
  RegisterUserValidation,
  VerifyEmailValidation,
  LoginUserValidation,
} from '../validation/UsersValidation.js';

// REGISTER
const RegisterUserService = async (request) => {
  const users = await Validation(RegisterUserValidation, request);
  const isEmailExist = await prismaClient.users.findFirst({
    where: {
      email: users.email,
    },
  });

  if (isEmailExist) {
    throw new ResponseError(409, 'Email sudah terdaftar!');
  }

  const otp = otpGenerator.generate(6, {
    digits: true,
    upperCase: false,
    specialChars: false,
    alphabets: false,
  });

  users.password = await bcrypt.hash(users.password, 10);
  users.role = 'user';
  users.otp = await bcrypt.hash(otp, 10);

  Transporter.sendMail({
    from: {
      name: 'Riot X',
      address: process.env.SMTP_EMAIL,
    },
    to: users.email,
    subject: 'Verifikasi Email',
    html: `<p>Silakan verifikasi email Anda dengan menggunakan kode OTP berikut: <strong>${otp}</strong></p>`,
  });

  return prismaClient.users.create({
    data: users,
  });
};

// VERIFIKASI EMAIL
const VerifikasiUserService = async (request) => {
  const users = await Validation(VerifyEmailValidation, request);
  const isEmailExist = await prismaClient.users.findUnique({
    where: {
      email: users.email,
    },
  });

  if (!isEmailExist) {
    throw new ResponseError(404, 'Email tidak ditemukan!');
  }

  const isOTPMatch = bcrypt.compare(users.otp, isEmailExist.otp);

  if (!isOTPMatch) {
    throw new ResponseError(400, 'OTP tidak valid!');
  } else if (isOTPMatch) {
    return prismaClient.users.update({
      where: {
        email: users.email,
      },
      data: {
        verifikasi_email: true,
        tanggal_verifikasi_email: new Date().toDateString(),
        otp: null,
      },
    });
  }
};

// LOGIN
const LoginUserService = async (request) => {
  const users = await Validation(LoginUserValidation, request);
  const usersData = await prismaClient.users.findFirst({
    where: {
      username: users.username,
    },
  });

  if (!usersData) {
    throw new ResponseError(401, 'Username atau password salah!');
  }

  if (
    !usersData.verifikasi_email &&
    usersData.tanggal_verifikasi_email === null
  ) {
    throw new ResponseError(403, 'Email anda belum diverifikasi!');
  }

  const isPasswordMatch = await bcrypt.compare(
    users.password,
    usersData.password,
  );

  if (!isPasswordMatch) {
    throw new ResponseError(401, 'Username atau password salah!');
  } else if (isPasswordMatch) {
    const payload = {
      id_user: usersData.id_users,
      email: usersData.email,
      role: usersData.role,
    };

    const accessToken = process.env.ACCESS_TOKEN;
    const tokenExpired = 60 * 60 * 24;
    const token = jwt.sign(payload, accessToken, {
      expiresIn: tokenExpired,
    });

    return {
      email: usersData.email,
      role: usersData.role,
      token: token,
    };
  }
};

export default {
  RegisterUserService,
  VerifikasiUserService,
  LoginUserService,
};