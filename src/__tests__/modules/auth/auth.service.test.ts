import { jest } from "@jest/globals";

import { authService } from "../../../modules/auth/auth.service.js";
import { passwordService } from "../../../modules/auth/password.service.js";
import { refreshTokenRepository } from "../../../modules/auth/refresh-token.repository.js";
import { refreshTokenService } from "../../../modules/auth/refresh-token.service.js";
import { revokedTokenRepository } from "../../../modules/auth/revoked-token.repository.js";
import { tokenService } from "../../../modules/auth/token.service.js";
import { usersRepository } from "../../../modules/users/users.repository.js";

describe("AuthService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("cria usuário com e-mail normalizado e senha em hash", async () => {
    jest.spyOn(usersRepository, "findByEmail").mockResolvedValueOnce(null);

    jest
      .spyOn(passwordService, "hash")
      .mockResolvedValueOnce("hashed-password");

    const create = jest
      .spyOn(usersRepository, "create")
      .mockResolvedValueOnce();

    const result = await authService.register({
      email: " User@Example.COM ",
      password: "StrongPass1!",
    });

    expect(result).toEqual({
      userId: expect.any(String),
      email: "user@example.com",
    });

    expect(create).toHaveBeenCalledWith({
      userId: expect.any(String),
      email: "user@example.com",
      passwordHash: "hashed-password",
    });
  });

  it("rejeita e-mail já cadastrado", async () => {
    jest.spyOn(usersRepository, "findByEmail").mockResolvedValueOnce({
      userId: "user-1",
      email: "user@example.com",
    });

    await expect(
      authService.register({
        email: "user@example.com",
        password: "StrongPass1!",
      }),
    ).rejects.toThrow("E-mail já cadastrado");
  });

  it.each([
    "short1!",
    "strongpass1!",
    "STRONGPASS1!",
    "StrongPass!",
    "StrongPass1",
  ])("rejeita senha fraca: %s", async (password) => {
    await expect(
      authService.register({
        email: "user@example.com",
        password,
      }),
    ).rejects.toThrow("Senha deve ter no mínimo 8 caracteres");
  });

  it("autentica o usuário e persiste o refresh token", async () => {
    jest.spyOn(usersRepository, "findByEmail").mockResolvedValueOnce({
      userId: "user-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
    });

    jest.spyOn(passwordService, "compare").mockResolvedValueOnce(true);

    jest
      .spyOn(tokenService, "createAccessToken")
      .mockReturnValueOnce("access-token");

    jest.spyOn(refreshTokenService, "create").mockReturnValueOnce({
      token: "refresh-token",
      tokenHash: "refresh-token-hash",
      expiresAt: 1_700_604_800,
    });

    const save = jest
      .spyOn(refreshTokenRepository, "save")
      .mockResolvedValueOnce();

    const result = await authService.login({
      email: "user@example.com",
      password: "plain-password",
    });

    expect(result).toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      refreshTokenExpiresAt: 1_700_604_800,
      user: {
        userId: "user-1",
        email: "user@example.com",
      },
    });

    expect(save).toHaveBeenCalledWith({
      tokenHash: "refresh-token-hash",
      userId: "user-1",
      createdAt: expect.any(Number),
      expiresAt: 1_700_604_800,
    });
  });

  it("rejeita quando o usuário não existe", async () => {
    jest.spyOn(usersRepository, "findByEmail").mockResolvedValueOnce(null);

    await expect(
      authService.login({
        email: "unknown@example.com",
        password: "plain-password",
      }),
    ).rejects.toThrow("Credenciais inválidas");
  });

  it("rejeita quando a senha é inválida", async () => {
    jest.spyOn(usersRepository, "findByEmail").mockResolvedValueOnce({
      userId: "user-1",
      email: "user@example.com",
      passwordHash: "hashed-password",
    });

    jest.spyOn(passwordService, "compare").mockResolvedValueOnce(false);

    await expect(
      authService.login({
        email: "user@example.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Credenciais inválidas");
  });

  it("rotaciona um refresh token válido", async () => {
    jest
      .spyOn(refreshTokenService, "hash")
      .mockReturnValueOnce("old-token-hash");

    jest.spyOn(refreshTokenRepository, "findByHash").mockResolvedValueOnce({
      tokenHash: "old-token-hash",
      userId: "user-1",
      createdAt: 1_699_900_000,
      expiresAt: 1_800_000_000,
    });

    jest
      .spyOn(tokenService, "createAccessToken")
      .mockReturnValueOnce("new-access-token");

    jest.spyOn(refreshTokenService, "create").mockReturnValueOnce({
      token: "new-refresh-token",
      tokenHash: "new-refresh-token-hash",
      expiresAt: 1_800_604_800,
    });

    const rotate = jest
      .spyOn(refreshTokenRepository, "rotate")
      .mockResolvedValueOnce();

    const result = await authService.refresh("old-refresh-token");

    expect(result).toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      refreshTokenExpiresAt: 1_800_604_800,
    });

    expect(rotate).toHaveBeenCalledWith(expect.objectContaining({
      tokenHash: "old-token-hash",
    }), {
      tokenHash: "new-refresh-token-hash",
      userId: "user-1",
      createdAt: expect.any(Number),
      expiresAt: 1_800_604_800,
    }, expect.any(Number));
  });

  it("rejeita um refresh token inexistente", async () => {
    jest
      .spyOn(refreshTokenRepository, "findByHash")
      .mockResolvedValueOnce(null);

    await expect(authService.refresh("unknown-refresh-token")).rejects.toThrow(
      "Refresh token inválido",
    );
  });

  it("rejeita um refresh token já revogado", async () => {
    jest.spyOn(refreshTokenRepository, "findByHash").mockResolvedValueOnce({
      tokenHash: "old-token-hash",
      userId: "user-1",
      createdAt: 1_699_900_000,
      expiresAt: 1_800_000_000,
      revokedAt: 1_700_000_100,
    });

    await expect(authService.refresh("revoked-refresh-token")).rejects.toThrow(
      "Refresh token inválido",
    );
  });

  it("rejeita um refresh token expirado", async () => {
    jest.spyOn(refreshTokenRepository, "findByHash").mockResolvedValueOnce({
      tokenHash: "old-token-hash",
      userId: "user-1",
      createdAt: 1_600_000_000,
      expiresAt: 1,
    });

    await expect(authService.refresh("expired-refresh-token")).rejects.toThrow(
      "Refresh token inválido",
    );
  });

  it("aceita um access token válido e não revogado", async () => {
    jest.spyOn(tokenService, "verifyAccessToken").mockReturnValueOnce({
      sub: "user-1",
      jti: "token-id",
      iat: 1_700_000_000,
      exp: 1_700_000_900,
    });

    jest
      .spyOn(revokedTokenRepository, "isRevoked")
      .mockResolvedValueOnce(false);

    const result = await authService.authenticateAccessToken("access-token");

    expect(result).toMatchObject({
      sub: "user-1",
      jti: "token-id",
    });
  });

  it("rejeita um access token revogado", async () => {
    jest.spyOn(tokenService, "verifyAccessToken").mockReturnValueOnce({
      sub: "user-1",
      jti: "revoked-token-id",
      iat: 1_700_000_000,
      exp: 1_700_000_900,
    });

    jest.spyOn(revokedTokenRepository, "isRevoked").mockResolvedValueOnce(true);

    await expect(
      authService.authenticateAccessToken("access-token"),
    ).rejects.toThrow("Access token revogado");
  });

  it("revoga o access token e o refresh token no logout", async () => {
    jest.spyOn(tokenService, "verifyAccessToken").mockReturnValueOnce({
      sub: "user-1",
      jti: "access-token-id",
      iat: 1_700_000_000,
      exp: 1_700_000_900,
    });

    const saveRevokedToken = jest
      .spyOn(revokedTokenRepository, "save")
      .mockResolvedValueOnce();

    jest
      .spyOn(refreshTokenService, "hash")
      .mockReturnValueOnce("refresh-token-hash");

    jest.spyOn(refreshTokenRepository, "findByHash").mockResolvedValueOnce({
      tokenHash: "refresh-token-hash",
      userId: "user-1",
      createdAt: 1_700_000_000,
      expiresAt: 1_700_604_800,
    });

    const revokeRefreshToken = jest
      .spyOn(refreshTokenRepository, "revoke")
      .mockResolvedValueOnce();

    await authService.logout("access-token", "refresh-token");

    expect(saveRevokedToken).toHaveBeenCalledWith({
      jti: "access-token-id",
      expiresAt: 1_700_000_900,
      revokedAt: expect.any(Number),
    });

    expect(revokeRefreshToken).toHaveBeenCalledWith(
      "refresh-token-hash",
      expect.any(Number),
    );
  });

  it("não falha ao revogar um refresh token inexistente no logout", async () => {
    jest.spyOn(tokenService, "verifyAccessToken").mockReturnValueOnce({
      sub: "user-1",
      jti: "access-token-id",
      iat: 1_700_000_000,
      exp: 1_700_000_900,
    });

    const saveRevokedToken = jest
      .spyOn(revokedTokenRepository, "save")
      .mockResolvedValueOnce();

    jest
      .spyOn(refreshTokenRepository, "findByHash")
      .mockResolvedValueOnce(null);

    const revokeRefreshToken = jest.spyOn(refreshTokenRepository, "revoke");

    await expect(
      authService.logout("access-token", "unknown-refresh-token"),
    ).resolves.toBeUndefined();

    expect(saveRevokedToken).toHaveBeenCalled();
    expect(revokeRefreshToken).not.toHaveBeenCalled();
  });
});
