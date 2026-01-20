import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  TrendingUp,
  Brain,
  Compass,
  ArrowRight,
} from "lucide-react";
import TextType from "@/components/react-bits/TextType";
import Galaxy from "@/components/react-bits/Galaxy";
import { ModeToggle } from "@/components/mode-toggle";
import { useTheme } from "@/components/theme-provider";
import SpotlightCard from "@/components/react-bits/SpotlightCard";

const Index = () => {
  const { theme } = useTheme();
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemDark(media.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const isDark = theme === "dark" || (theme === "system" && systemDark);

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-background via-muted to-background overflow-hidden">
      {/* {isDark && (
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <Galaxy
            mouseRepulsion={true}
            mouseInteraction={true}
            density={1.5}
            glowIntensity={0.5}
            saturation={0.8}
            hueShift={240}
          />
        </div>
      )} */}
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">SmartPath</span>
          </Link>
          <div className="flex items-center gap-3">
            <ModeToggle />
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button className="bg-primary hover:bg-primary-dark">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Brain className="w-4 h-4" />
            AI-Powered Learning Platform
          </div>

          <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
            Excel Academically &<br />
            Make Informed{" "}
            {isDark ? (
              <TextType
                as="span"
                className="text-primary"
                text={["Career Decisions", "Study Plans", "Exam Success"]}
                typingSpeed={75}
                pauseDuration={1500}
                showCursor={true}
                cursorCharacter="|"
              />
            ) : (
              <span className="text-primary">Career Decisions</span>
            )}
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            SmartPath helps Kenyan high school students reach their full
            potential with personalized insights, performance tracking, and
            AI-powered career guidance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/register">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary-dark h-12 px-8 text-base"
              >
                Start Your Journey
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools designed specifically for Kenyan students
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isDark ? (
            <>
              <SpotlightCard
                className="custom-spotlight-card p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow"
                spotlightColor="rgba(0, 229, 255, 0.2)"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Performance Tracking
                </h3>
                <p className="text-muted-foreground">
                  Monitor your grades, identify strengths and weaknesses, and track
                  your progress over time.
                </p>
              </SpotlightCard>

              <SpotlightCard
                className="custom-spotlight-card p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow"
                spotlightColor="rgba(0, 229, 255, 0.2)"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Smart Flashcards
                </h3>
                <p className="text-muted-foreground">
                  AI-generated flashcards tailored to your subjects with instant
                  feedback on your answers.
                </p>
              </SpotlightCard>

              <SpotlightCard
                className="custom-spotlight-card p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow"
                spotlightColor="rgba(0, 229, 255, 0.2)"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <Compass className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Career Guidance
                </h3>
                <p className="text-muted-foreground">
                  Get personalized career recommendations based on your interests
                  and academic performance.
                </p>
              </SpotlightCard>

              <SpotlightCard
                className="custom-spotlight-card p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow"
                spotlightColor="rgba(0, 229, 255, 0.2)"
              >
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6 text-info" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Study Plans
                </h3>
                <p className="text-muted-foreground">
                  AI-generated study schedules optimized for your goals and
                  available time.
                </p>
              </SpotlightCard>
            </>
          ) : (
            <>
              <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Performance Tracking
                </h3>
                <p className="text-muted-foreground">
                  Monitor your grades, identify strengths and weaknesses, and track
                  your progress over time.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Smart Flashcards
                </h3>
                <p className="text-muted-foreground">
                  AI-generated flashcards tailored to your subjects with instant
                  feedback on your answers.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                  <Compass className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Career Guidance
                </h3>
                <p className="text-muted-foreground">
                  Get personalized career recommendations based on your interests
                  and academic performance.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6 text-info" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Study Plans
                </h3>
                <p className="text-muted-foreground">
                  AI-generated study schedules optimized for your goals and
                  available time.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary to-primary-light rounded-3xl p-12 text-center text-white shadow-xl">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Ready to Transform Your Learning?
          </h2> 
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of students already using SmartPath to achieve their
            academic goals.
          </p>
          <Link to="/register">
            <Button
              size="lg"
              variant="secondary"
              className="h-12 px-8 text-base"
            >
              Get Started for Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">
                SmartPath
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date().getFullYear() === 2025
                ? `© ${new Date().getFullYear()} SmartPath. Empowering Kenyan students to excel.`
                : `© ${new Date().getFullYear()} SmartPath. Empowering Kenyan students to excel.`}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
