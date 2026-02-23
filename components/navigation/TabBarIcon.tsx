import React from 'react';
import { Ionicons } from '@expo/vector-icons'; // Using Ionicons as a common choice
import { ComponentProps } from 'react';

interface TabBarIconProps extends ComponentProps<typeof Ionicons> {
  name: ComponentProps<typeof Ionicons>['name'];
  color: string;
}

export function TabBarIcon(props: TabBarIconProps) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}
