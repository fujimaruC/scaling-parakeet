import React, { type ComponentPropsWithoutRef } from 'react';
export function Box({
  className = '',
  ...props
}: ComponentPropsWithoutRef<'section'>) {
  return <section {...props} className={`pixel-box ${className}`} />;
}
export function Chip(props: ComponentPropsWithoutRef<'span'>) {
  return <span {...props} className={`pixel-chip ${props.className ?? ''}`} />;
}
export function Tag(props: ComponentPropsWithoutRef<'span'>) {
  return <span {...props} className={`pixel-tag ${props.className ?? ''}`} />;
}
export function Button({
  primary = false,
  ...props
}: ComponentPropsWithoutRef<'button'> & { primary?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`${primary ? 'primary ' : ''}${props.className ?? ''}`}
    />
  );
}
