import { randomUUID } from "node:crypto";

import { usersRepository } from "../users/users.repository.js";
import { passwordService } from "./password.service.js";
import { refreshTokenRepository } from "./refresh-token.repository.js";
import { refreshTokenService } from "./refresh-token.service.js";
import { revokedTokenRepository } from "./revoked-token.repository.js";
import { type AccessTokenPayload, tokenService } from "./token.service.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface RegisterResult {
  userId: string;
  email: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: number;
  user: {
    userId: string;
    email: string;
  };
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: number;
}

export class AuthService {
  async register(input: RegisterInput): Promise<RegisterResult> {
    const email = input.email.trim().toLowerCase();

    if (email === "") {
      throw new Error("E-mail é obrigatório");
    }

    const strongPassword =
      input.password.length >= 8 &&
      /[A-Z]/.test(input.password) &&
      /[a-z]/.test(input.password) &&
      /\d/.test(input.password) &&
      /[^A-Za-z0-9]/.test(input.password);

    if (!strongPassword) {
      throw new Error(
        "Senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial",
      );
    }

    const existingUser = await usersRepository.findByEmail(email);

    if (existingUser !== null) {
      throw new Error("E-mail já cadastrado");
    }

    const userId = randomUUID();
    const passwordHash = await passwordService.hash(input.password);

    try {
      await usersRepository.create({
        userId,
        email,
        passwordHash,
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new Error("E-mail ja cadastrado");
      }

      throw error;
    }

    return {
      userId,
      email,
    };
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await usersRepository.findByEmail(input.email);
    const passwordHash = user?.passwordHash;

    if (
      user === null ||
      typeof passwordHash !== "string" ||
      !(await passwordService.compare(input.password, passwordHash))
    ) {
      throw new Error("Credenciais inválidas");
    }

    const accessToken = tokenService.createAccessToken(user.userId);
    const refreshToken = refreshTokenService.create();
    const createdAt = Math.floor(Date.now() / 1000);

    await refreshTokenRepository.save({
      tokenHash: refreshToken.tokenHash,
      userId: user.userId,
      createdAt,
      expiresAt: refreshToken.expiresAt,
    });

    return {
      accessToken,
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt,
      user: {
        userId: user.userId,
        email: user.email,
      },
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    const tokenHash = refreshTokenService.hash(refreshToken);
    const storedToken = await refreshTokenRepository.findByHash(tokenHash);

    const nowInSeconds = Math.floor(Date.now() / 1000);

    if (
      storedToken === null ||
      storedToken.revokedAt !== undefined ||
      storedToken.expiresAt <= nowInSeconds
    ) {
      throw new Error("Refresh token inválido");
    }

    const accessToken = tokenService.createAccessToken(storedToken.userId);
    const newRefreshToken = refreshTokenService.create();

    await refreshTokenRepository.rotate(
      storedToken,
      {
        tokenHash: newRefreshToken.tokenHash,
        userId: storedToken.userId,
        createdAt: nowInSeconds,
        expiresAt: newRefreshToken.expiresAt,
      },
      nowInSeconds,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken.token,
      refreshTokenExpiresAt: newRefreshToken.expiresAt,
    };
  }

  async logout(accessToken: string, refreshToken: string): Promise<void> {
    const payload = tokenService.verifyAccessToken(accessToken);
    const nowInSeconds = Math.floor(Date.now() / 1000);

    await revokedTokenRepository.save({
      jti: payload.jti,
      expiresAt: payload.exp,
      revokedAt: nowInSeconds,
    });

    const tokenHash = refreshTokenService.hash(refreshToken);
    const storedToken = await refreshTokenRepository.findByHash(tokenHash);

    if (storedToken === null || storedToken.revokedAt !== undefined) {
      return;
    }

    await refreshTokenRepository.revoke(storedToken.tokenHash, nowInSeconds);
  }

  async authenticateAccessToken(
    accessToken: string,
  ): Promise<AccessTokenPayload> {
    const payload = tokenService.verifyAccessToken(accessToken);
    const revoked = await revokedTokenRepository.isRevoked(payload.jti);

    if (revoked) {
      throw new Error("Access token revogado");
    }

    return payload;
  }
}

export const authService = new AuthService();
