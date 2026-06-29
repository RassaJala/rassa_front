import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";

const CATEGORIES = ["Frutas", "Verduras", "Granos", "Raíces", "Hierbas", "Lácteos"];
const UNITS = ["kg", "pieza", "caja", "bolsa", "litro"];

export default function AddProductScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "Frutas",
    unit: "kg",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.stock) {
      setError("Por favor completa los campos obligatorios.");
      return;
    }
    setLoading(true);
    setError("");
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      navigation.goBack();
    }, 1500);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Mis Productos</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Publicar Producto</Text>
        <Text style={styles.subtitle}>Llena los detalles de tu producto</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ ¡Producto publicado con éxito!</Text>
          </View>
        ) : null}

        {/* Image upload placeholder */}
        <TouchableOpacity style={styles.imageUpload}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>📸</Text>
          <Text style={styles.imageUploadText}>Toca para subir fotos del producto</Text>
          <Text style={styles.imageUploadSub}>PNG, JPG hasta 5MB</Text>
        </TouchableOpacity>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nombre del producto *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Manzanas Fuji orgánicas"
            placeholderTextColor="#aaa"
            value={form.name}
            onChangeText={(v) => update("name", v)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe tu producto: origen, cuidados, sabor..."
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={4}
            value={form.description}
            onChangeText={(v) => update("description", v)}
          />
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Categoría</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, form.category === c && styles.chipActive]}
                  onPress={() => update("category", c)}
                >
                  <Text style={[styles.chipText, form.category === c && styles.chipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Price & Stock row */}
        <View style={[styles.row, isMobile && styles.rowMobile]}>
          <View style={[styles.fieldGroup, styles.flex]}>
            <Text style={styles.label}>Precio *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
              value={form.price}
              onChangeText={(v) => update("price", v)}
            />
          </View>
          <View style={styles.spacer} />
          <View style={[styles.fieldGroup, styles.flex]}>
            <Text style={styles.label}>Stock *</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={form.stock}
              onChangeText={(v) => update("stock", v)}
            />
          </View>
        </View>

        {/* Unit */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Unidad de medida</Text>
          <View style={styles.chipRow}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.chip, form.unit === u && styles.chipActive]}
                onPress={() => update("unit", u)}
              >
                <Text style={[styles.chipText, form.unit === u && styles.chipTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview card */}
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Vista previa</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewImg}>
              <Text style={{ fontSize: 32 }}>🌾</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.previewName}>{form.name || "Nombre del producto"}</Text>
              <Text style={styles.previewPrice}>
                ${form.price || "0.00"} / {form.unit}
              </Text>
              <Text style={styles.previewStock}>Stock: {form.stock || "0"}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>🚀 Publicar Producto</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const GREEN = "#16a34a";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: GREEN,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, alignSelf: "flex-start" },
  backText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  content: { padding: 20, paddingBottom: 40, maxWidth: 600, alignSelf: "center", width: "100%" },
  title: { fontSize: 26, fontWeight: "800", color: "#1e293b", marginBottom: 4, marginTop: 8 },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  errorBox: { backgroundColor: "#fef2f2", borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#fca5a5" },
  errorText: { color: "#dc2626", fontSize: 13, textAlign: "center" },
  successBox: { backgroundColor: "#f0fdf4", borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#bbf7d0" },
  successText: { color: "#16a34a", fontSize: 14, fontWeight: "700", textAlign: "center" },
  imageUpload: {
    height: 150,
    borderWidth: 2,
    borderColor: "#d1fae5",
    borderStyle: "dashed",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#f0fdf4",
  },
  imageUploadText: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  imageUploadSub: { fontSize: 12, color: "#94a3b8" },
  fieldGroup: { marginBottom: 16 },
  flex: { flex: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#d1fae5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a1a1a",
    backgroundColor: "#f9fffe",
    outlineStyle: "none",
  } as any,
  textArea: { height: 100, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1.5, borderColor: "#d1fae5", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "#f9fffe" },
  chipActive: { borderColor: GREEN, backgroundColor: "#dcfce7" },
  chipText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  chipTextActive: { color: "#15803d" },
  row: { flexDirection: "row", gap: 12 },
  rowMobile: { flexDirection: "column" },
  spacer: { width: 12 },
  preview: { marginBottom: 20 },
  previewTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 10 },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: "#d1fae5",
  },
  previewImg: { width: 52, height: 52, borderRadius: 10, backgroundColor: "#f0fdf4", justifyContent: "center", alignItems: "center" },
  previewName: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginBottom: 2 },
  previewPrice: { fontSize: 14, color: GREEN, fontWeight: "600", marginBottom: 2 },
  previewStock: { fontSize: 12, color: "#64748b" },
  btn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  btnDisabled: { backgroundColor: "#86efac" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
