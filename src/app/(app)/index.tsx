import { Text, View, StyleSheet } from "react-native";
import { useAuth } from "@/context/auth";

export default function AppHome() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        Hola{user?.user_metadata.display_name ? `, ${user.user_metadata.display_name}` : ""}!
      </Text>
      <Text style={styles.subtitle}>Tu jardín te espera.</Text>
      <View style={styles.buttonContainer}>
        <Text style={styles.button} onPress={signOut}>
          Cerrar sesión
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F8F3",
    padding: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2D3F2A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7B6A",
    marginBottom: 40,
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    fontSize: 16,
    color: "#8B5E3C",
    textDecorationLine: "underline",
  },
});
