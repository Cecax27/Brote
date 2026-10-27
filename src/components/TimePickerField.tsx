import { useState } from "react";
import { Pressable, Text, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/theme";

type Props = {
  value: string;
  onChange: (hhmm: string) => void;
  disabled?: boolean;
};

function toDate(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function toHHMM(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function TimePickerField({ value, onChange, disabled = false }: Props) {
  const { colors, type, radii } = useTheme();
  const [show, setShow] = useState(false);
  const [date, setDate] = useState(() => toDate(value));

  const handleChange = (_event: unknown, selected?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
    }
    if (selected) {
      setDate(selected);
      onChange(toHHMM(selected));
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        disabled={disabled}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.input,
          paddingVertical: 14,
          paddingHorizontal: 16,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text
          style={{
            fontFamily: type.body.fontFamily,
            fontSize: type.body.size,
            color: colors.text.primary,
          }}
        >
          {value} hs
        </Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          onChange={handleChange}
          positiveButton={{ label: "Listo", textColor: colors.primary }}
          negativeButton={{ label: "Cancelar", textColor: colors.text.secondary }}
        />
      )}
    </>
  );
}
