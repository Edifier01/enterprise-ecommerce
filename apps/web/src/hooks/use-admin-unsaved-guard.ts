"use client";

import { useCallback, useEffect } from "react";

const DEFAULT_MESSAGE =
  "Есть несохранённые изменения. Уйти со страницы без сохранения?";

export function useAdminUnsavedGuard(
  dirty: boolean,
  message: string = DEFAULT_MESSAGE,
) {
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const confirmLeave = useCallback(() => {
    if (!dirty) {
      return true;
    }
    return window.confirm(message);
  }, [dirty, message]);

  return { confirmLeave };
}
