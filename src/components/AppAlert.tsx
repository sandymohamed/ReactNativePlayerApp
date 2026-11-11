
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  BackHandler,
} from 'react-native';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
  dismissible?: boolean;
}

interface AppAlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const COLORS = {
  background: '#0A0A0F',
  card: '#181824',
  cardBorder: '#303044',
  primary: '#7C6CF6',
  focus: '#A99EFF',
  text: '#FFFFFF',
  muted: '#A0A0B2',
  success: '#5EEAD4',
  error: '#F87171',
  warning: '#FBBF24',
  info: '#60A5FA',
};

const AppAlertContext = createContext<AppAlertContextType | undefined>(
  undefined,
);

const ALERT_CONFIG = {
  success: {
    color: COLORS.success,
    icon: '✓',
  },
  error: {
    color: COLORS.error,
    icon: '!',
  },
  warning: {
    color: COLORS.warning,
    icon: '⚠',
  },
  info: {
    color: COLORS.info,
    icon: 'i',
  },
};

export function AppAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [alert, setAlert] = useState<AlertOptions | null>(null);

  const hideAlert = useCallback(() => {
    setAlert(null);
  }, []);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlert({
      ...options,
      type: options.type || 'info',
      buttons:
        options.buttons || [
          {
            text: 'OK',
            style: 'primary',
          },
        ],
      dismissible: options.dismissible ?? true,
    });
  }, []);

  const handleButtonPress = useCallback(
    (button: AlertButton) => {
      hideAlert();
      button.onPress?.();
    },
    [hideAlert],
  );

  const contextValue = useMemo(
    () => ({
      showAlert,
      hideAlert,
    }),
    [showAlert, hideAlert],
  );

  const config = alert
    ? ALERT_CONFIG[alert.type || 'info']
    : ALERT_CONFIG.info;

  return (
    <AppAlertContext.Provider value={contextValue}>
      {children}

      <Modal
        visible={!!alert}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (alert?.dismissible !== false) {
            hideAlert();
          }
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            {alert && (
              <>
                {/* Icon */}
                <View
                  style={[
                    styles.iconContainer,
                    { borderColor: config.color },
                  ]}
                >
                  <Text
                    style={[
                      styles.icon,
                      { color: config.color },
                    ]}
                  >
                    {config.icon}
                  </Text>
                </View>

                {/* Content */}
                <Text style={styles.title}>
                  {alert.title}
                </Text>

                <Text style={styles.message}>
                  {alert.message}
                </Text>

                {/* Actions */}
                <View style={styles.buttonsContainer}>
                  {alert.buttons?.map((button, index) => {
                    const buttonStyle =
                      button.style || 'primary';

                    return (
                      <Pressable
                        key={`${button.text}-${index}`}
                        hasTVPreferredFocus={
                          Platform.isTV && index === 0
                        }
                        onPress={() =>
                          handleButtonPress(button)
                        }
                        style={({ focused }) => [
                          styles.button,
                          buttonStyle === 'primary' &&
                            styles.primaryButton,
                          buttonStyle === 'secondary' &&
                            styles.secondaryButton,
                          buttonStyle === 'danger' &&
                            styles.dangerButton,
                          focused && styles.focusedButton,
                        ]}
                      >
                        {({ focused }) => (
                          <Text
                            style={[
                              styles.buttonText,
                              buttonStyle === 'secondary' &&
                                styles.secondaryButtonText,
                              focused && styles.focusedButtonText,
                            ]}
                          >
                            {button.text}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const context = useContext(AppAlertContext);

  if (!context) {
    throw new Error(
      'useAppAlert must be used inside AppAlertProvider',
    );
  }

  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  dialog: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 24,
    alignItems: 'center',
    elevation: 20,
  },

  iconContainer: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#222230',
  },

  icon: {
    fontSize: 30,
    fontWeight: '800',
  },

  title: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },

  message: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 28,
  },

  buttonsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },

  button: {
    minWidth: 110,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
  },

  secondaryButton: {
    backgroundColor: '#252535',
    borderColor: COLORS.cardBorder,
  },

  dangerButton: {
    backgroundColor: '#8F3038',
  },

  buttonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },

  secondaryButtonText: {
    color: COLORS.muted,
  },

  focusedButton: {
    borderColor: COLORS.focus,
    borderWidth: 3,
    transform: [{ scale: 1.04 }],
  },

  focusedButtonText: {
    color: '#FFFFFF',
  },
});
