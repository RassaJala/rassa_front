import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ErrorBoundary from '@/components/ErrorBoundary';
import { colors } from '@/constants/colors';
import { MONTH_NAMES } from '@/constants/dates';
import { useAdminColors } from '@/hooks/useAdminColors';
import { fetchMermaResumen } from '@/services/waste';
import type { MermaResumenItem, MermaResumenResponse } from '@/services/waste';
import { useTheme } from '@/store/ThemeContext';
import type { AdminStackParamList } from '@/types';

// --- Navigation --------------------------------------------------------------

type Nav = NativeStackNavigationProp<AdminStackParamList, 'MermaResumen'>;

interface Props {
  readonly navigation: Nav;
}

// --- Helpers -----------------------------------------------------------------

const TODAY = new Date();

function parseDate(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function formatDisplayDate(iso: string): string {
  const d = parseDate(iso);
  if (!d) return iso;
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()] ?? ''} ${d.getFullYear()}`;
}

const MONTH_NAMES_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

function toLocalDate(iso: string): Date | null {
  const datePart = iso.slice(0, 10);
  const parts = datePart.split('-').map(Number);
  if (parts.length < 2 || !parts[0] || !parts[1]) return null;
  return new Date(parts[0], parts[1] - 1, parts[2] ?? 1);
}

function getMonthLabel(iso: string): string {
  const d = toLocalDate(iso);
  if (!d || isNaN(d.getTime())) return iso;
  return `${MONTH_NAMES_SHORT[d.getMonth()] ?? iso} ${String(d.getFullYear()).slice(2)}`;
}

function getWeekLabel(iso: string): string {
  const d = toLocalDate(iso);
  if (!d || isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  const week = Math.ceil((diff + 86_400_000) / (7 * 86_400_000));
  return `Sem ${week} (${day})`;
}

function periodLabel(iso: string, agrupacion: string): string {
  return agrupacion === 'semana' ? getWeekLabel(iso) : getMonthLabel(iso);
}

function toDateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function parseInitialDate(
  dateStr?: string,
): { year: number; month: number; day: number } | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const parts = dateStr.split('-').map(Number);
  return {
    year: parts[0] ?? TODAY.getFullYear(),
    month: (parts[1] ?? 1) - 1,
    day: parts[2] ?? 1,
  };
}

// --- Decision color map -----------------------------------------------------

const DECISION_COLORS: Record<string, string> = {
  donar: '#3A6D56',
  tirar: '#DE393A',
  compostar: '#CED295',
};

const FALLBACK_COLORS = [
  '#E46C38',
  '#D52E7A',
  '#EEAA6F',
  '#B2C2B2',
  '#AEC0BC',
  '#A19FB6',
  '#24563C',
  '#D8D3C8',
];

function getDecisionColor(decision: string): string {
  const key = decision.toLowerCase().trim();
  const mapped = DECISION_COLORS[key];
  if (mapped) return mapped;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[idx] ?? '#9CA3AF';
}

// --- Aggregations -----------------------------------------------------------

function groupBy<T>(
  items: T[],
  key: (x: T) => string,
  sum: (x: T) => number,
): { nombre: string; total: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(key(item), (map.get(key(item)) ?? 0) + sum(item));
  }
  return Array.from(map.entries())
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);
}

interface ProductOption {
  id: number;
  nombre: string;
}

function extractProducts(detalle: MermaResumenItem[]): ProductOption[] {
  const seen = new Map<number, string>();
  for (const d of detalle) {
    if (!seen.has(d.producto_id)) {
      seen.set(d.producto_id, d.producto_nombre);
    }
  }
  return Array.from(seen.entries()).map(([id, nombre]) => ({ id, nombre }));
}

// --- Date Picker Modal ------------------------------------------------------

const YEARS_RANGE = 5;

interface DatePickerModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSelectDate: (iso: string) => void;
  readonly initialDate?: string;
  readonly surface: string;
  readonly fg: string;
  readonly muted: string;
  readonly brand: string;
  readonly segBg: string;
}

function MermaDateModal({
  visible,
  onClose,
  onSelectDate,
  initialDate,
  surface,
  fg,
  muted,
  brand,
  segBg,
}: DatePickerModalProps) {
  const [step, setStep] = useState<'year' | 'month' | 'day'>('year');
  const [selYear, setSelYear] = useState<number | null>(null);
  const [selMonth, setSelMonth] = useState<number | null>(null);
  const [selDay, setSelDay] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      const p = parseInitialDate(initialDate);
      if (p) {
        setSelYear(p.year);
        setSelMonth(p.month);
        setSelDay(p.day);
        setStep('day');
      } else {
        setSelYear(null);
        setSelMonth(null);
        setSelDay(null);
        setStep('year');
      }
    }
  }, [visible, initialDate]);

  if (!visible) return null;

  const years = Array.from(
    { length: YEARS_RANGE + 1 },
    (_, i) => TODAY.getFullYear() - i,
  );
  const months = MONTH_NAMES;
  const daysCount =
    selYear !== null && selMonth !== null
      ? getDaysInMonth(selYear, selMonth)
      : 31;
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const canConfirm = selYear !== null && selMonth !== null && selDay !== null;

  function handleSelectYear(y: number) {
    setSelYear(y);
    setSelMonth(null);
    setSelDay(null);
    setStep('month');
  }

  function handleSelectMonth(m: number) {
    setSelMonth(m);
    setSelDay(null);
    setStep('day');
  }

  function handleSelectDay(d: number) {
    setSelDay(d);
    if (selYear !== null && selMonth !== null) {
      onSelectDate(toDateString(selYear, selMonth, d));
      onClose();
    }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: surface,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 20,
            maxHeight: '70%',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>
              Seleccionar fecha
            </Text>
            <Pressable onPress={onClose}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: brand }}>
                Cancelar
              </Text>
            </Pressable>
          </View>

          {/* Tab bar */}
          <View
            style={{
              flexDirection: 'row',
              borderRadius: 12,
              backgroundColor: segBg,
              padding: 4,
              marginBottom: 16,
            }}
          >
            {(
              [
                { key: 'year', label: 'Año', value: selYear },
                {
                  key: 'month',
                  label: 'Mes',
                  value: selMonth !== null ? (months[selMonth] ?? '') : null,
                },
                { key: 'day', label: 'Día', value: selDay },
              ] as const
            ).map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setStep(tab.key)}
                disabled={tab.key === 'month' && selYear === null}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  borderRadius: 8,
                  paddingVertical: 8,
                  backgroundColor:
                    step === tab.key ? surface : colors.transparent,
                  opacity: tab.key === 'month' && selYear === null ? 0.4 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: muted,
                  }}
                >
                  {tab.label}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: step === tab.key ? brand : fg,
                  }}
                >
                  {tab.value ?? '---'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Content */}
          <ScrollView
            style={{ maxHeight: 280 }}
            showsVerticalScrollIndicator={false}
          >
            {step === 'year' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {years.map((y) => (
                  <Pressable
                    key={y}
                    onPress={() => handleSelectYear(y)}
                    style={[
                      pickStyles.item,
                      {
                        backgroundColor: selYear === y ? brand : segBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        pickStyles.itemText,
                        { color: selYear === y ? colors.iconWhite : fg },
                      ]}
                    >
                      {y}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {step === 'month' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {months.map((name, idx) => (
                  <Pressable
                    key={name}
                    onPress={() => handleSelectMonth(idx)}
                    style={[
                      pickStyles.item,
                      {
                        backgroundColor: selMonth === idx ? brand : segBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        pickStyles.itemText,
                        { color: selMonth === idx ? colors.iconWhite : fg },
                      ]}
                    >
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {step === 'day' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {days.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => handleSelectDay(d)}
                    style={[
                      pickStyles.dayItem,
                      {
                        backgroundColor: selDay === d ? brand : segBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        pickStyles.itemText,
                        { color: selDay === d ? colors.iconWhite : fg },
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Confirm button */}
          {canConfirm ? (
            <Pressable
              onPress={() => {
                if (selYear !== null && selMonth !== null && selDay !== null) {
                  onSelectDate(toDateString(selYear, selMonth, selDay));
                  onClose();
                }
              }}
              style={{
                marginTop: 16,
                borderRadius: 12,
                backgroundColor: brand,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.iconWhite,
                }}
              >
                Listo
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pickStyles = StyleSheet.create({
  item: {
    width: '30%',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  itemText: { fontSize: 15, fontWeight: '600' },
  dayItem: {
    width: '17%',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
});

// --- Product picker modal -----------------------------------------------------

interface ProductoPickerModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSelect: (id: number | undefined) => void;
  readonly selectedId: number | undefined;
  readonly products: { id: number; nombre: string }[];
  readonly surface: string;
  readonly fg: string;
  readonly muted: string;
  readonly brand: string;
  readonly bg: string;
}

function ProductoPickerModal({
  visible,
  onClose,
  onSelect,
  selectedId,
  products,
  surface,
  fg,
  muted,
  brand,
  bg,
}: ProductoPickerModalProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase().trim();
    return products.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 24,
          backgroundColor: colors.modalOverlayBg,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: surface,
            borderRadius: 16,
            maxHeight: '80%',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: fg }}>
              Seleccionar producto
            </Text>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: bg,
                borderRadius: 10,
                paddingHorizontal: 12,
              }}
            >
              <MaterialCommunityIcons name="magnify" size={18} color={muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar producto..."
                placeholderTextColor={muted}
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: fg,
                  paddingVertical: 10,
                  paddingLeft: 8,
                }}
              />
            </View>
          </View>

          {/* List */}
          <FlatList
            data={[{ id: -1, nombre: 'Todos los productos' }, ...filtered]}
            keyExtractor={(item) => String(item.id)}
            style={{ maxHeight: 350 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item }) => {
              const isSelected =
                item.id === selectedId ||
                (item.id === -1 && selectedId === undefined);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    onSelect(item.id === -1 ? undefined : item.id);
                    onClose();
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: isSelected ? brand : colors.transparent,
                    marginHorizontal: 8,
                    borderRadius: 10,
                    marginVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: isSelected ? colors.iconWhite : fg,
                    }}
                  >
                    {item.nombre}
                  </Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: muted, fontSize: 14 }}>
                  Sin resultados
                </Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// --- Styles ------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  content: { flex: 1, paddingTop: 48, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  filterCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  filterField: { flex: 1 },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateField: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateFieldText: { fontSize: 14, fontWeight: '500' },
  dateFieldPlaceholder: { fontSize: 14 },
  productSection: { marginBottom: 12 },
  segRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segBtnText: { fontSize: 13, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700' },
  resetBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 22, fontWeight: '700', marginTop: 6 },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  chartSubtitle: { fontSize: 12, fontWeight: '500', marginBottom: 14 },
  barItem: { marginBottom: 12 },
  barLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  barRank: { width: 22, fontSize: 12, fontWeight: '600' },
  barLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  barValue: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
    textAlign: 'right',
  },
  barTrack: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: { height: '100%', borderRadius: 8, minWidth: 4 },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: 4,
  },
  trendCol: { flex: 1, alignItems: 'center' },
  trendValue: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  trendBar: { width: '100%', borderRadius: 4, minHeight: 4, maxWidth: 36 },
  trendLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemBadge: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  itemContent: { flex: 1 },
  itemProduct: { fontSize: 14, fontWeight: '600' },
  itemDecision: { fontSize: 12, marginTop: 2 },
  itemAmounts: { alignItems: 'flex-end' },
  itemCantidad: { fontSize: 16, fontWeight: '700' },
  itemMermas: { fontSize: 11, marginTop: 1 },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  paginationInfo: { fontSize: 12, fontWeight: '500' },
  paginationBtns: { flexDirection: 'row', gap: 6 },
  pageBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
  },

  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: { fontSize: 14, fontWeight: '500', flex: 1 },
});

const PAGE_SIZE = 10;

// --- Component ---------------------------------------------------------------

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function MermaResumenScreen({
  navigation,
}: Props): React.JSX.Element {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { bg, surface, fg, muted, border, brand } = useAdminColors();
  const coral = colors.brandRedCoral;
  const segBg = isDark ? colors.admSegBgD : colors.admSegBgL;

  // Date picker state
  const [pickerTarget, setPickerTarget] = useState<'desde' | 'hasta' | null>(
    null,
  );
  const showPicker = pickerTarget !== null;

  // Product picker
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Draft filter values
  const [draftDesde, setDraftDesde] = useState('');
  const [draftHasta, setDraftHasta] = useState('');
  const [productoId, setProductoId] = useState<number | undefined>(undefined);
  const [agruparPor, setAgruparPor] = useState<'mes' | 'semana'>('mes');

  // Applied filter values (what triggers fetch)
  const [appliedDesde, setAppliedDesde] = useState('');
  const [appliedHasta, setAppliedHasta] = useState('');

  // Pagination
  const [pagina, setPagina] = useState(1);
  const scrollRef = useRef<ScrollView>(null);

  // ── Render helpers ──

  function renderEmptyState(): React.JSX.Element {
    return (
      <View style={styles.centerBox}>
        <MaterialCommunityIcons name="inbox-outline" size={48} color={muted} />
        <Text
          style={{
            marginTop: 12,
            fontSize: 16,
            fontWeight: '600',
            color: muted,
          }}
        >
          Sin resultados
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontSize: 13,
            color: muted,
            textAlign: 'center',
          }}
        >
          No se encontraron mermas con los filtros seleccionados.
        </Text>
      </View>
    );
  }

  // Data
  const [data, setData] = useState<MermaResumenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(0);
  const retryCountRef = useRef(0);

  // Date validation
  const desdeDate = draftDesde ? parseDate(draftDesde) : null;
  const hastaDate = draftHasta ? parseDate(draftHasta) : null;
  const isDateRangeInvalid =
    desdeDate !== null && hastaDate !== null && desdeDate > hastaDate;

  // Fetch
  const fetchData = useCallback(async () => {
    const id = ++fetchRef.current;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { agrupar_por: agruparPor };
      if (appliedDesde) params.fecha_desde = appliedDesde;
      if (appliedHasta) params.fecha_hasta = appliedHasta;
      if (productoId !== undefined) params.producto_id = String(productoId);
      const result = await fetchMermaResumen(params);
      if (id !== fetchRef.current) return; // stale, discard
      retryCountRef.current = 0;
      setData(result);
      setPagina(1);
    } catch (e) {
      if (id !== fetchRef.current) return;
      retryCountRef.current += 1;
      console.error(e);
      setError('Error al cargar los datos.');
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  }, [appliedDesde, appliedHasta, agruparPor, productoId]);

  // Fetch on mount + when applied filters or grouping change
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Handlers
  const handleApply = () => {
    setAppliedDesde(draftDesde);
    setAppliedHasta(draftHasta);
  };

  const handleReset = () => {
    setDraftDesde('');
    setDraftHasta('');
    setAppliedDesde('');
    setAppliedHasta('');
    setProductoId(undefined);
    setAgruparPor('mes');
    setPagina(1);
  };

  // Derived data
  const detalle = useMemo(() => data?.detalle ?? [], [data?.detalle]);
  const isSingleProduct = productoId !== undefined;

  const {
    productRanking,
    maxProductTotal,
    periodData,
    maxPeriod,
    totalRegistros,
  } = useMemo(() => {
    const ranking = isSingleProduct
      ? groupBy(
          detalle,
          (x) => x.decision_nombre,
          (x) => x.total_cantidad,
        )
      : groupBy(
          detalle,
          (x) => x.producto_nombre,
          (x) => x.total_cantidad,
        );
    const maxProd = Math.max(...ranking.map((p) => p.total), 1);
    const sorted = [...detalle].sort((a, b) =>
      a.periodo.localeCompare(b.periodo),
    );
    const periods = groupBy(
      sorted,
      (x) => periodLabel(x.periodo, data?.agrupacion ?? 'mes'),
      (x) => x.total_cantidad,
    );
    const maxPer = Math.max(...periods.map((p) => p.total), 1);
    const totalRegs = detalle.reduce((sum, item) => sum + item.total_mermas, 0);
    return {
      productRanking: ranking,
      maxProductTotal: maxProd,
      periodData: periods,
      maxPeriod: maxPer,
      totalRegistros: totalRegs,
    };
  }, [detalle, isSingleProduct, data?.agrupacion]);

  const products = useMemo(() => extractProducts(detalle), [detalle]);

  const totalPaginas = Math.max(1, Math.ceil(detalle.length / PAGE_SIZE));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const detallePaginado = useMemo(
    () =>
      detalle.slice((paginaSegura - 1) * PAGE_SIZE, paginaSegura * PAGE_SIZE),
    [detalle, paginaSegura],
  );

  const isEmpty = detalle.length === 0 && !loading;

  // Severity color for product ranking
  function rankColor(index: number, total: number): string {
    if (total <= 1) return isDark ? '#4B5563' : '#D1D5DB';
    if (index === 0) return coral;
    if (index === 1) return '#E46C38';
    if (index === 2) return '#F2A900';
    return isDark ? '#4A8A63' : '#3A6D56';
  }

  // ── Render ──

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* ═══ Header ═══ */}
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [
                  styles.backBtn,
                  { backgroundColor: surface, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={22}
                  color={fg}
                />
              </Pressable>
              <Text style={[styles.headerTitle, { color: fg }]}>
                Dashboard de Mermas
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* ═══ Filters ═══ */}
            <View
              style={[
                styles.filterCard,
                { backgroundColor: surface, borderColor: border },
              ]}
            >
              {/* Date fields */}
              <View style={styles.filterRow}>
                {/* Desde */}
                <View style={styles.filterField}>
                  <Text style={[styles.filterLabel, { color: muted }]}>
                    Desde
                  </Text>
                  <Pressable
                    onPress={() => setPickerTarget('desde')}
                    style={[
                      styles.dateField,
                      { backgroundColor: bg, borderColor: border },
                    ]}
                  >
                    <Text
                      style={
                        draftDesde
                          ? [styles.dateFieldText, { color: fg }]
                          : [styles.dateFieldPlaceholder, { color: muted }]
                      }
                      numberOfLines={1}
                    >
                      {draftDesde
                        ? formatDisplayDate(draftDesde)
                        : 'Seleccionar'}
                    </Text>
                    <MaterialCommunityIcons
                      name="calendar-month-outline"
                      size={20}
                      color={muted}
                    />
                  </Pressable>
                </View>

                {/* Hasta */}
                <View style={styles.filterField}>
                  <Text style={[styles.filterLabel, { color: muted }]}>
                    Hasta
                  </Text>
                  <Pressable
                    onPress={() => setPickerTarget('hasta')}
                    style={[
                      styles.dateField,
                      { backgroundColor: bg, borderColor: border },
                    ]}
                  >
                    <Text
                      style={
                        draftHasta
                          ? [styles.dateFieldText, { color: fg }]
                          : [styles.dateFieldPlaceholder, { color: muted }]
                      }
                      numberOfLines={1}
                    >
                      {draftHasta
                        ? formatDisplayDate(draftHasta)
                        : 'Seleccionar'}
                    </Text>
                    <MaterialCommunityIcons
                      name="calendar-month-outline"
                      size={20}
                      color={muted}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Product selector */}
              {products.length > 0 && (
                <View style={styles.productSection}>
                  <Text style={[styles.filterLabel, { color: muted }]}>
                    Producto
                  </Text>
                  <Pressable
                    onPress={() => setShowProductPicker(true)}
                    style={[
                      styles.dateField,
                      { backgroundColor: bg, borderColor: border },
                    ]}
                  >
                    <Text
                      style={
                        productoId !== undefined
                          ? [styles.dateFieldText, { color: fg }]
                          : [styles.dateFieldPlaceholder, { color: muted }]
                      }
                      numberOfLines={1}
                    >
                      {productoId !== undefined
                        ? (products.find((p) => p.id === productoId)?.nombre ??
                          'Seleccionar')
                        : 'Todos los productos'}
                    </Text>
                    <MaterialCommunityIcons
                      name="menu-down"
                      size={20}
                      color={muted}
                    />
                  </Pressable>
                </View>
              )}

              {/* Group toggle */}
              <View style={[styles.segRow, { backgroundColor: segBg }]}>
                <Pressable
                  onPress={() => setAgruparPor('mes')}
                  style={[
                    styles.segBtn,
                    {
                      backgroundColor:
                        agruparPor === 'mes' ? surface : colors.transparent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segBtnText,
                      { color: agruparPor === 'mes' ? brand : muted },
                    ]}
                  >
                    Mes
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setAgruparPor('semana')}
                  style={[
                    styles.segBtn,
                    {
                      backgroundColor:
                        agruparPor === 'semana' ? surface : colors.transparent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segBtnText,
                      { color: agruparPor === 'semana' ? brand : muted },
                    ]}
                  >
                    Semana
                  </Text>
                </Pressable>
              </View>

              {/* Actions */}
              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleApply}
                  disabled={isDateRangeInvalid}
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: isDateRangeInvalid ? muted : brand,
                      opacity: isDateRangeInvalid ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[styles.primaryBtnText, { color: colors.iconWhite }]}
                  >
                    Buscar
                  </Text>
                </Pressable>

                {appliedDesde || appliedHasta || agruparPor !== 'mes' ? (
                  <Pressable
                    onPress={handleReset}
                    style={[
                      styles.resetBtn,
                      { borderColor: border, backgroundColor: surface },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={18}
                      color={muted}
                    />
                  </Pressable>
                ) : null}
              </View>

              {isDateRangeInvalid ? (
                <Text style={[styles.warningText, { color: coral }]}>
                  «Hasta» debe ser mayor o igual a «Desde»
                </Text>
              ) : null}
            </View>

            {/* ═══ Error ═══ */}
            {error !== null && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: isDark
                      ? colors.admErrorBgD
                      : colors.admErrorBgL,
                    borderColor: isDark
                      ? colors.admErrorBorderD
                      : colors.admErrorBorderL,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={22}
                  color={isDark ? colors.admErrorTextD : colors.admErrorTextL}
                />
                <Text
                  style={[
                    styles.errorText,
                    {
                      color: isDark
                        ? colors.admErrorTextD
                        : colors.admErrorTextL,
                    },
                  ]}
                >
                  {retryCountRef.current >= 3
                    ? 'No pudimos cargar los datos. Contactá al administrador.'
                    : error}
                </Text>
                {retryCountRef.current < 3 && (
                  <Pressable onPress={() => void fetchData()}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isDark
                          ? colors.admErrorActionD
                          : colors.admErrorActionL,
                      }}
                    >
                      Reintentar
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* ═══ Loading ═══ */}
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={brand} />
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    color: muted,
                    fontWeight: '500',
                  }}
                >
                  Cargando...
                </Text>
              </View>
            ) : null}

            {/* ═══ Data ═══ */}
            {!loading && error === null && data !== null && (
              <>
                {isEmpty ? (
                  renderEmptyState()
                ) : (
                  <>
                    {/* ═══ Summary cards ═══ */}
                    <View style={styles.summaryRow}>
                      <View
                        style={[
                          styles.summaryCard,
                          { backgroundColor: surface, borderColor: border },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="package-variant"
                          size={24}
                          color={brand}
                        />
                        <Text style={[styles.summaryValue, { color: fg }]}>
                          {data.total_general}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: muted }]}>
                          Unidades mermadas
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.summaryCard,
                          { backgroundColor: surface, borderColor: border },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="trophy"
                          size={24}
                          color={coral}
                        />
                        {data.producto_mas_afectado !== null ? (
                          <>
                            <Text
                              style={[
                                styles.summaryValue,
                                { color: fg, fontSize: 18 },
                              ]}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                            >
                              {data.producto_mas_afectado.nombre}
                            </Text>
                            <Text
                              style={[styles.summaryLabel, { color: muted }]}
                            >
                              {data.producto_mas_afectado.total} perdidos
                            </Text>
                          </>
                        ) : (
                          <Text
                            style={[
                              styles.summaryValue,
                              { color: muted, fontSize: 14 },
                            ]}
                          >
                            Sin datos
                          </Text>
                        )}
                      </View>

                      <View
                        style={[
                          styles.summaryCard,
                          { backgroundColor: surface, borderColor: border },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="clipboard-list"
                          size={24}
                          color={colors.accent}
                        />
                        <Text style={[styles.summaryValue, { color: fg }]}>
                          {totalRegistros}
                        </Text>
                        <Text style={[styles.summaryLabel, { color: muted }]}>
                          Registros
                        </Text>
                      </View>
                    </View>

                    {/* ═══ Product ranking chart ═══ */}
                    <View
                      style={[
                        styles.chartCard,
                        { backgroundColor: surface, borderColor: border },
                      ]}
                    >
                      <Text style={[styles.chartTitle, { color: fg }]}>
                        {isSingleProduct
                          ? 'Desglose por decisión'
                          : 'Ranking de productos más mermados'}
                      </Text>
                      <Text style={[styles.chartSubtitle, { color: muted }]}>
                        {isSingleProduct
                          ? 'Cantidad de unidades por cada decisión tomada'
                          : 'La barra más larga = el producto que más pérdidas genera'}
                      </Text>
                      {productRanking.length > 0 ? (
                        productRanking.map((item, idx) => {
                          const pct = (item.total / maxProductTotal) * 100;
                          return (
                            <View
                              key={
                                isSingleProduct
                                  ? `d-${item.nombre}`
                                  : item.nombre
                              }
                              style={styles.barItem}
                            >
                              {/* Label row */}
                              <View style={styles.barLabelRow}>
                                {!isSingleProduct && (
                                  <Text
                                    style={[styles.barRank, { color: muted }]}
                                  >
                                    {idx + 1}.
                                  </Text>
                                )}
                                <Text
                                  style={[styles.barLabel, { color: fg }]}
                                  numberOfLines={1}
                                >
                                  {item.nombre}
                                </Text>
                                <Text style={[styles.barValue, { color: fg }]}>
                                  {item.total} uds
                                </Text>
                              </View>
                              {/* Bar row */}
                              <View
                                style={[
                                  styles.barTrack,
                                  {
                                    backgroundColor: border,
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.barFill,
                                    {
                                      width: `${Math.max(pct, 3)}%`,
                                      backgroundColor: isSingleProduct
                                        ? getDecisionColor(item.nombre)
                                        : rankColor(idx, productRanking.length),
                                    },
                                  ]}
                                />
                              </View>
                            </View>
                          );
                        })
                      ) : (
                        <Text
                          style={{
                            textAlign: 'center',
                            color: muted,
                            paddingVertical: 20,
                          }}
                        >
                          No hay datos de productos para mostrar.
                        </Text>
                      )}
                    </View>

                    {/* ═══ Period trend chart ═══ */}
                    <View
                      style={[
                        styles.chartCard,
                        { backgroundColor: surface, borderColor: border },
                      ]}
                    >
                      <Text style={[styles.chartTitle, { color: fg }]}>
                        Evolución por {agruparPor === 'mes' ? 'mes' : 'semana'}
                      </Text>
                      <Text style={[styles.chartSubtitle, { color: muted }]}>
                        Cada barra = total de unidades mermadas en ese período
                      </Text>
                      {periodData.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          <View style={styles.trendRow}>
                            {periodData.map((item) => {
                              const pct = (item.total / maxPeriod) * 100;
                              return (
                                <View key={item.nombre} style={styles.trendCol}>
                                  <Text
                                    style={[styles.trendValue, { color: fg }]}
                                  >
                                    {item.total}
                                  </Text>
                                  <View
                                    style={[
                                      styles.trendBar,
                                      {
                                        height: `${Math.max(pct, 4)}%`,
                                        backgroundColor: brand,
                                      },
                                    ]}
                                  />
                                  <Text
                                    style={[
                                      styles.trendLabel,
                                      { color: muted },
                                    ]}
                                  >
                                    {item.nombre}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </ScrollView>
                      ) : (
                        <Text
                          style={{
                            textAlign: 'center',
                            color: muted,
                            paddingVertical: 20,
                          }}
                        >
                          No hay suficientes datos para mostrar tendencia.
                        </Text>
                      )}
                    </View>

                    {/* ═══ Detail list ═══ */}
                    <View
                      style={[
                        styles.chartCard,
                        { backgroundColor: surface, borderColor: border },
                      ]}
                    >
                      <Text style={[styles.chartTitle, { color: fg }]}>
                        Detalle de mermas
                      </Text>

                      {detallePaginado.map((item) => (
                        <View
                          key={`${item.producto_id}-${item.decision_id}-${item.periodo}`}
                          style={[
                            styles.itemCard,
                            { backgroundColor: surface, borderColor: border },
                          ]}
                        >
                          <View
                            style={[
                              styles.itemBadge,
                              {
                                backgroundColor: getDecisionColor(
                                  item.decision_nombre,
                                ),
                              },
                            ]}
                          />
                          <View style={styles.itemContent}>
                            <Text
                              style={[styles.itemProduct, { color: fg }]}
                              numberOfLines={1}
                            >
                              {item.producto_nombre}
                            </Text>
                            <Text
                              style={[styles.itemDecision, { color: muted }]}
                            >
                              {periodLabel(item.periodo, data.agrupacion)}{' '}
                              &middot; {item.decision_nombre}
                            </Text>
                          </View>
                          <View style={styles.itemAmounts}>
                            <Text
                              style={[styles.itemCantidad, { color: coral }]}
                            >
                              {item.total_cantidad}
                            </Text>
                            <Text style={[styles.itemMermas, { color: muted }]}>
                              {item.total_mermas} merma
                              {item.total_mermas !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                      ))}

                      {/* Pagination */}
                      {totalPaginas > 1 && (
                        <View
                          style={[
                            styles.paginationRow,
                            { borderTopColor: border },
                          ]}
                        >
                          <Text
                            style={[styles.paginationInfo, { color: muted }]}
                          >
                            Página {paginaSegura} de {totalPaginas}
                          </Text>
                          <View style={styles.paginationBtns}>
                            <Pressable
                              disabled={paginaSegura <= 1}
                              onPress={() => {
                                setPagina((p) => Math.max(1, p - 1));
                                scrollRef.current?.scrollTo({
                                  y: 0,
                                  animated: true,
                                });
                              }}
                              style={[
                                styles.pageBtn,
                                {
                                  borderColor: border,
                                  backgroundColor: surface,
                                  opacity: paginaSegura <= 1 ? 0.4 : 1,
                                },
                              ]}
                            >
                              <MaterialCommunityIcons
                                name="chevron-left"
                                size={18}
                                color={fg}
                              />
                            </Pressable>

                            <Pressable
                              disabled={paginaSegura >= totalPaginas}
                              onPress={() => {
                                setPagina((p) => Math.min(totalPaginas, p + 1));
                                scrollRef.current?.scrollTo({
                                  y: 0,
                                  animated: true,
                                });
                              }}
                              style={[
                                styles.pageBtn,
                                {
                                  borderColor: border,
                                  backgroundColor: surface,
                                  opacity:
                                    paginaSegura >= totalPaginas ? 0.4 : 1,
                                },
                              ]}
                            >
                              <MaterialCommunityIcons
                                name="chevron-right"
                                size={18}
                                color={fg}
                              />
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {/* ═══ Date picker modal ═══ */}
        <MermaDateModal
          visible={showPicker}
          onClose={() => setPickerTarget(null)}
          onSelectDate={(iso) => {
            if (pickerTarget === 'desde') {
              setDraftDesde(iso);
            } else {
              setDraftHasta(iso);
            }
            setPickerTarget(null);
          }}
          initialDate={pickerTarget === 'desde' ? draftDesde : draftHasta}
          surface={surface}
          fg={fg}
          muted={muted}
          brand={brand}
          segBg={segBg}
        />

        {/* ═══ Product picker modal ═══ */}
        <ProductoPickerModal
          visible={showProductPicker}
          onClose={() => setShowProductPicker(false)}
          onSelect={(id) => {
            setProductoId(id);
            setPagina(1);
          }}
          selectedId={productoId}
          products={products}
          surface={surface}
          fg={fg}
          muted={muted}
          brand={brand}
          bg={bg}
        />
      </View>
    </ErrorBoundary>
  );
}
