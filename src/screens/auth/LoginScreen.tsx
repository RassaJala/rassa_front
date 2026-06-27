import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth } from "../../store/AuthContext";

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-6">
      <View className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <View className="items-center mb-8">
          <Text className="text-4xl font-extrabold text-green-600 mb-2 tracking-tight">Rassa</Text>
          <Text className="text-gray-500 text-base">Bienvenido de nuevo</Text>
        </View>

        {error ? (
          <View className="bg-red-50 p-3 rounded-lg mb-4 border border-red-100">
            <Text className="text-red-500 text-sm text-center">{error}</Text>
          </View>
        ) : null}

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-1 ml-1">Correo Electrónico</Text>
            <TextInput
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
              placeholder="tu@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-1 ml-1 mt-4">Contraseña</Text>
            <TextInput
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className={`w-full py-4 rounded-xl items-center mt-6 shadow-sm ${
              loading ? "bg-green-400" : "bg-green-600 active:bg-green-700"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-500">¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text className="text-green-600 font-bold">Regístrate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
