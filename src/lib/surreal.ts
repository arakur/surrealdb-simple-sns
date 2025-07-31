import { RecordId, Surreal, SurrealDbError } from "surrealdb";
import { endpoint, namespace, database } from "@/lib/surreal-config.json";
import { getSession } from "./session";

export const SurrealDb = new Surreal();

export const SurrealConnection = new Promise<Surreal>(
  async (resolve, reject) => {
    try {
      await SurrealDb.connect(endpoint, {
        namespace,
        database,
      });
      resolve(SurrealDb);
    } catch (e) {
      reject(e);
    }
  }
);

export async function signupSurreal(
  username: string,
  password: string
): Promise<{ token: string }> {
  const client = await SurrealConnection;
  const token = await client.signup({
    namespace,
    database,
    access: "account",
    variables: {
      username: username,
      password: password,
    },
  });
  if (!token) {
    throw new Error("Failed to authenticate with SurrealDB");
  }
  client.authenticate(token);
  return { token };
}

export async function signinSurreal(
  username: string,
  password: string
): Promise<
  | { result: "ok"; token: string }
  | {
      result: "error";
      errorKind: "invalid_credentials" | "unknown error";
      errorMessage: string;
    }
> {
  const client = await SurrealConnection;
  let token: string;
  try {
    token = await client.signin({
      namespace,
      database,
      access: "account",
      variables: {
        username: username,
        password: password,
      },
    });
  } catch (error) {
    if (error instanceof SurrealDbError) {
      if (
        error.message ===
        "There was a problem with the database: No record was returned"
      ) {
        return {
          result: "error",
          errorKind: "invalid_credentials",
          errorMessage: "Invalid username or password",
        };
      } else {
        console.error(`Sign-in error: "${error.message}"`);
        return {
          result: "error",
          errorKind: "unknown error",
          errorMessage: error.message,
        };
      }
    }
    console.error("Unknown error during sign-in:", error);
    return {
      result: "error",
      errorKind: "unknown error",
      errorMessage: `${error}`,
    };
  }
  client.authenticate(token);
  return { result: "ok", token };
}

export async function surrealAuthConnection(): Promise<
  | {
      result: "ok";
      client: Surreal;
      username: string;
      id: RecordId<string>;
    }
  | {
      result: "error";
      errorKind: "unauthenticated" | "token expired" | "unknown error";
      errorMessage: string;
    }
> {
  const client = await SurrealConnection;
  const session = await getSession();

  if (!session) {
    return {
      result: "error",
      errorKind: "unauthenticated",
      errorMessage: "User is not authenticated",
    };
  }

  try {
    await client.authenticate(session.token);
  } catch (error) {
    if (error instanceof SurrealDbError) {
      if (
        error.message ===
        "There was a problem with the database: The token has expired"
      ) {
        return {
          result: "error",
          errorKind: "token expired",
          errorMessage: "Token has expired",
        };
      } else {
        console.error(`Authentication error: "${error.message}"`);
        return {
          result: "error",
          errorKind: "unknown error",
          errorMessage: error.message,
        };
      }
    }
    console.error("Unknown error during authentication:", error);
    return {
      result: "error",
      errorKind: "unknown error",
      errorMessage: `${error}`,
    };
  }

  const [id] = await client.query<[RecordId<string>]>(`RETURN $auth.id`);

  return { result: "ok", client, username: session.username, id };
}
