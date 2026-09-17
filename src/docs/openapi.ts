export const openapiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Node Auth API",
    version: "1.0.0",
    description: "API de autenticação e consulta paginada de produtos.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Ambiente local",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Verificação de disponibilidade da API",
    },
    {
      name: "Auth",
      description: "Autenticação e gerenciamento de sessão",
    },
    {
      name: "Products",
      description: "Consulta de produtos",
    },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Verifica a saúde da API",
        responses: {
          "200": {
            description: "API disponível",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthResponse",
                },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Autentica um usuário",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Usuário autenticado",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LoginResponse",
                },
              },
            },
          },
          "400": {
            description: "Dados inválidos",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "401": {
            description: "Credenciais inválidas",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Cria um usuário",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Usuário criado",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RegisterResponse",
                },
              },
            },
          },
          "400": {
            description: "Dados inválidos",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          "409": {
            description: "E-mail já cadastrado",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Renova a sessão",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RefreshRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sessão renovada",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RefreshResponse",
                },
              },
            },
          },
          "401": {
            description: "Refresh token inválido",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Encerra a sessão atual",
        security: [
          {
            BearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LogoutRequest",
              },
            },
          },
        },
        responses: {
          "204": {
            description: "Sessão encerrada",
          },
          "401": {
            description: "Access token inválido ou revogado",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/products": {
      get: {
        tags: ["Products"],
        summary: "Lista produtos de forma paginada",
        security: [
          {
            BearerAuth: [],
          },
        ],
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Quantidade máxima de produtos retornados",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          {
            name: "cursor",
            in: "query",
            required: false,
            description: "Cursor opaco da próxima página",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          "200": {
            description: "Produtos retornados",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProductListResponse",
                },
              },
            },
          },
          "401": {
            description: "Access token inválido ou revogado",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      HealthResponse: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            example: "ok",
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          password: {
            type: "string",
            format: "password",
            example: "password",
          },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
          password: {
            type: "string",
            format: "password",
            minLength: 8,
            example: "StrongPass1!",
          },
        },
      },
      RegisterResponse: {
        type: "object",
        required: ["userId", "email"],
        properties: {
          userId: {
            type: "string",
          },
          email: {
            type: "string",
            format: "email",
          },
        },
      },
      LoginResponse: {
        type: "object",
        required: [
          "accessToken",
          "refreshToken",
          "refreshTokenExpiresAt",
          "user",
        ],
        properties: {
          accessToken: {
            type: "string",
          },
          refreshToken: {
            type: "string",
          },
          refreshTokenExpiresAt: {
            type: "integer",
            format: "int64",
          },
          user: {
            $ref: "#/components/schemas/User",
          },
        },
      },
      RefreshRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: {
            type: "string",
          },
        },
      },
      RefreshResponse: {
        type: "object",
        required: ["accessToken", "refreshToken", "refreshTokenExpiresAt"],
        properties: {
          accessToken: {
            type: "string",
          },
          refreshToken: {
            type: "string",
          },
          refreshTokenExpiresAt: {
            type: "integer",
            format: "int64",
          },
        },
      },
      LogoutRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: {
            type: "string",
          },
        },
      },
      User: {
        type: "object",
        required: ["userId", "email"],
        properties: {
          userId: {
            type: "string",
            example: "user-1",
          },
          email: {
            type: "string",
            format: "email",
            example: "user@example.com",
          },
        },
      },
      Product: {
        type: "object",
        required: ["productId"],
        properties: {
          productId: {
            type: "string",
          },
        },
        additionalProperties: true,
      },
      ProductListResponse: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Product",
            },
          },
          nextCursor: {
            type: "string",
            nullable: true,
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["message"],
        properties: {
          message: {
            type: "string",
          },
        },
      },
    },
  },
};
