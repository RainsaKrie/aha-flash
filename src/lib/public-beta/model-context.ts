import { AsyncLocalStorage } from "node:async_hooks";

export interface ModelAccessContext {
  requestId: string;
  callType: "flow" | "chat";
  anonymousUserId: string;
  sessionId: string;
  flowId?: string;
  allowed: boolean;
  internalBypass?: boolean;
  budgetExhausted?: boolean;
  modelCallCount: number;
  retryCount: number;
  repairCount: number;
}

const modelAccessStorage = new AsyncLocalStorage<ModelAccessContext>();

export function createModelAccessContext(
  context: Omit<ModelAccessContext, "modelCallCount" | "retryCount" | "repairCount">,
): ModelAccessContext {
  return {
    ...context,
    modelCallCount: 0,
    retryCount: 0,
    repairCount: 0,
  };
}

export function runWithModelAccess<T>(
  context: ModelAccessContext,
  operation: () => Promise<T>,
) {
  return modelAccessStorage.run(context, operation);
}

export function getModelAccessContext() {
  return modelAccessStorage.getStore();
}

export function hasModelAccess() {
  const context = getModelAccessContext();
  return Boolean(context && (context.allowed || context.internalBypass));
}
