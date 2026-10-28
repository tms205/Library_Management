import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import BooksScreen from '../screens/BooksScreen';
import MyBooksScreen from '../screens/MyBooksScreen';
import BorrowManagementScreen from '../screens/BorrowManagementScreen';
import MemberManagementScreen from '../screens/MemberManagementScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const { userInfo } = useAuth();

  const isAdminOrStaff =
    Boolean(
      userInfo?.isAdminOrStaff ||
      userInfo?.role === 'ADMIN' ||
      userInfo?.role === 'STAFF' ||
      (Array.isArray(userInfo?.permissions) &&
        userInfo?.permissions.some((p) =>
          ['BORROW_APPROVE', 'MEMBER_VIEW', 'BOOK_CREATE', 'SYSTEM_MAINTENANCE'].includes(p),
        )),
    );

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#818cf8',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* Tab 1: Sách (chung cho mọi vai trò, Admin có thêm nút Thêm/Sửa/Xóa) */}
      <Tab.Screen
        name="BooksTab"
        component={BooksScreen}
        options={{
          title: isAdminOrStaff ? 'Quản lý Sách' : 'Khám phá Sách',
          tabBarLabel: 'Sách',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 22 : 18 }}>📚</Text>
          ),
        }}
      />

      {/* Tab 2: Nếu là Admin/Staff -> Duyệt mượn trả; Nếu là User -> Sách của tôi */}
      {isAdminOrStaff ? (
        <Tab.Screen
          name="BorrowManageTab"
          component={BorrowManagementScreen}
          options={{
            title: 'Quản lý Mượn / Trả',
            tabBarLabel: 'Duyệt mượn',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: focused ? 22 : 18 }}>📋</Text>
            ),
          }}
        />
      ) : (
        <Tab.Screen
          name="MyBooksTab"
          component={MyBooksScreen}
          options={{
            title: 'Sách của tôi',
            tabBarLabel: 'Đang mượn',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: focused ? 22 : 18 }}>📖</Text>
            ),
          }}
        />
      )}

      {/* Tab 3: Dành riêng cho Admin/Staff -> Quản lý Độc giả */}
      {isAdminOrStaff && (
        <Tab.Screen
          name="MembersTab"
          component={MemberManagementScreen}
          options={{
            title: 'Quản lý Độc giả',
            tabBarLabel: 'Độc giả',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: focused ? 22 : 18 }}>👥</Text>
            ),
          }}
        />
      )}

      {/* Tab Cuối: Thông tin cá nhân & Cài đặt hệ thống */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: isAdminOrStaff ? 'Hệ thống & Cá nhân' : 'Thông tin cá nhân',
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: focused ? 22 : 18 }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { userToken, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Đang khởi động ứng dụng...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {userToken == null ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                headerShown: true,
                title: 'Đăng ký tài khoản',
                headerStyle: { backgroundColor: '#1e293b' },
                headerTintColor: '#f8fafc',
              }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{
                headerShown: true,
                title: 'Khôi phục mật khẩu',
                headerStyle: { backgroundColor: '#1e293b' },
                headerTintColor: '#f8fafc',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
});
