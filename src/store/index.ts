import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import animeReducer from './animeSlice';
import { animeApi } from './api/animeApi';

function initStore() {
  return configureStore({
    reducer: {
      anime: animeReducer,
      [animeApi.reducerPath]: animeApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(animeApi.middleware),
  });
}

// Ensure the Redux store remains completely stable throughout the entire app lifecycle
// and survives Fast Refresh/HMR without creating secondary store instances that trigger
// RTK Query "rendered with a different Redux store" warnings.
const globalStoreKey = '__HINDIANIME_APP_STORE__';
const globalObj = globalThis as unknown as Record<string, ReturnType<typeof initStore>>;

export const store = globalObj[globalStoreKey] || (globalObj[globalStoreKey] = initStore());

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
