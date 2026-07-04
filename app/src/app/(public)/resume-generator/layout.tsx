export default function ResumeGeneratorLayout({
    children,
    modal,
  }: {
    children: React.ReactNode;
    modal: React.ReactNode;
  }) {
    return (
      <>
        {children}
        {modal}
      </>
    );
  }
  