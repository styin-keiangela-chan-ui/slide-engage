'use client';

type OfficeAsyncResult = {
  status: string;
  value?: unknown;
  error?: { message?: string };
};

function getOffice() {
  return typeof window !== 'undefined' ? (window as any).Office : undefined;
}

export function isPowerPointHostReady() {
  const office = getOffice();
  return Boolean(office?.context?.host && office.context.host === office.HostType.PowerPoint);
}

export async function waitForOfficeReady() {
  const office = getOffice();
  if (!office?.onReady) return false;
  const info = await office.onReady();
  return info?.host === office.HostType.PowerPoint;
}

export async function insertTextIntoCurrentSelection(text: string) {
  const office = getOffice();
  if (!office?.context?.document) {
    throw new Error('PowerPoint document API is not available.');
  }

  return new Promise<void>((resolve, reject) => {
    office.context.document.setSelectedDataAsync(
      text,
      { coercionType: office.CoercionType.Text },
      (result: OfficeAsyncResult) => {
        if (result.status === office.AsyncResultStatus.Succeeded) resolve();
        else reject(new Error(result.error?.message || 'Unable to insert text into PowerPoint.'));
      }
    );
  });
}

export async function insertPresentationFromBase64(base64: string) {
  const office = getOffice();
  if (!office?.context?.document?.insertFileFromBase64Async) {
    throw new Error('PowerPoint slide insertion API is not available.');
  }

  return new Promise<void>((resolve, reject) => {
    office.context.document.insertFileFromBase64Async(base64, (result: OfficeAsyncResult) => {
      if (result.status === office.AsyncResultStatus.Succeeded) resolve();
      else reject(new Error(result.error?.message || 'Unable to insert slide into PowerPoint.'));
    });
  });
}

export function onPowerPointSelectionChanged(callback: () => void) {
  const office = getOffice();
  if (!office?.context?.document?.addHandlerAsync) return () => {};

  const handler = () => callback();
  office.context.document.addHandlerAsync(office.EventType.DocumentSelectionChanged, handler);

  return () => {
    office.context.document.removeHandlerAsync(
      office.EventType.DocumentSelectionChanged,
      { handler },
      () => {}
    );
  };
}

export async function readCurrentSelectionText() {
  const office = getOffice();
  if (!office?.context?.document?.getSelectedDataAsync) return '';

  return new Promise<string>(resolve => {
    office.context.document.getSelectedDataAsync(
      office.CoercionType.Text,
      (result: OfficeAsyncResult) => {
        resolve(typeof result.value === 'string' ? result.value : '');
      }
    );
  });
}
