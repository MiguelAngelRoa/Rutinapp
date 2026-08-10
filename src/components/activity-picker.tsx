import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useWorkout } from '@/context/workout-context';
import { useTheme } from '@/hooks/use-theme';

type ActivityPickerProps = {
  selected: string;
  onSelect: (activity: string) => void;
  onCancel: () => void;
};

export function ActivityPicker({ selected, onSelect, onCancel }: ActivityPickerProps) {
  const theme = useTheme();
  const { activities, addActivity } = useWorkout();
  const [draft, setDraft] = useState('');

  const canAdd = draft.trim().length > 0;

  const handleAdd = () => {
    const name = draft.trim();
    if (!name) return;
    addActivity(name);
    onSelect(name);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.center}>
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemedText type="heading" style={styles.title}>
            Elegir actividad
          </ThemedText>

          <View style={styles.addRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Nueva actividad (p. ej. Jiu Jitsu)"
              placeholderTextColor={theme.textSecondary}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            <Button label="Añadir" size="md" disabled={!canAdd} onPress={handleAdd} />
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            <Option
              label="Ninguna"
              selected={selected === ''}
              onPress={() => {
                onSelect('');
                onCancel();
              }}
            />
            {activities.map((activity) => (
              <Option
                key={activity}
                label={activity}
                selected={selected === activity}
                onPress={() => {
                  onSelect(activity);
                  onCancel();
                }}
              />
            ))}
            {activities.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Aún no tienes actividades guardadas. Escribe una arriba y pulsa «Añadir».
              </ThemedText>
            )}
          </ScrollView>

          <Button
            label="Cancelar"
            variant="ghost"
            size="md"
            onPress={onCancel}
            style={styles.button}
          />
        </ThemedView>
      </View>
    </View>
  );
}

type OptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Option({ label, selected, onPress }: OptionProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { borderColor: selected ? theme.accent : theme.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.optionBody}>
        <ThemedText type="smallBold" numberOfLines={1} style={[selected && { color: theme.accent }]}>
          {label}
        </ThemedText>
      </View>
      {selected && <MaterialCommunityIcons name="check" size={20} color={theme.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  center: {
    width: '100%',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  list: {
    maxHeight: 240,
  },
  listContent: {
    gap: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  optionBody: {
    flex: 1,
  },
  button: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.6,
  },
});
