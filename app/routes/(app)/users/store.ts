import { createModalStore } from "~/store/createModalStore";
import { createTableStore } from "~/store/useTableStore";

export const useUsersStore = createTableStore();

export type UsersModals = {
  deactivate: string;
  activate: string;
  resetPassword: string;
};

export const useUsersModals = createModalStore<UsersModals>(["deactivate", "activate", "resetPassword"]);
