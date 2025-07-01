import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/UserSlice"
import { persistReducer,persistStore } from "redux-persist";
import { combineReducers } from "@reduxjs/toolkit";
import storage from 'redux-persist/lib/storage'

const rootReducer = combineReducers({
    user: userReducer
});

const persistConfig = {
    key : "root",
    storage,
    whitelist :["user"]
}

const persistedReducer = persistReducer(persistConfig,rootReducer)

export const store = configureStore({
    reducer:persistedReducer,
    middleware:(getDefaultMiddleware)=>
        getDefaultMiddleware({
            serializableCheck: false,
        })
})

export const persistor = persistStore(store);