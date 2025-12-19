export function Footer() {
  return (
    <footer className="h-12 border-t bg-white flex items-center justify-center text-sm text-muted-foreground">
      <p>&copy; {new Date().getFullYear()} JSSolar. All rights reserved.</p>
    </footer>
  );
}
