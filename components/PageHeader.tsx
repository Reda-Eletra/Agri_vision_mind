import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  eyebrow?: string;
  eyebrowIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = () => null;
