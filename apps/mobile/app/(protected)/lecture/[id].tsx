import { useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { fontScaleOptions, radii, spacing, typography } from "@plume/shared";
import {
  Button,
  Card,
  ChapterEndSocial,
  ErrorState,
  IconButton,
  InlineNotice,
  Input,
  LoadingState,
  Sheet,
  Text,
} from "@/components";
import { Prose } from "@/components/Prose";
import { trpc } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
import { toast } from "@/lib/toast";
import { getReadingTheme, palette, theme } from "@/theme";
import { useUiStore } from "@/lib/ui";

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chapterId = String(id ?? "");
  const router = useRouter();
  const readingTheme = useUiStore((state) => state.readingTheme);
  const setReadingTheme = useUiStore((state) => state.setReadingTheme);
  const fontScale = useUiStore((state) => state.fontScale);
  const setFontScale = useUiStore((state) => state.setFontScale);

  const chapterQuery = trpc.reading.chapter.useQuery({ chapterId }, { enabled: Boolean(chapterId) });
  const saveProgress = trpc.reading.saveProgress.useMutation();
  const addBookmark = trpc.reading.addBookmark.useMutation();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);

  const lastSaved = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentProgress = useRef(0);

  const chapter = chapterQuery.data;

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function queueProgress(next: number) {
    currentProgress.current = next;
    setProgress(next);
    if (!chapter) return;
    if (Math.abs(next - lastSaved.current) < 0.04 && next < 0.98) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      lastSaved.current = next;
      saveProgress.mutate({
        storyId: chapter.story.id,
        chapterId: chapter.chapter.id,
        progress: Math.min(1, Math.max(0, next)),
      });
    }, 900);
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollable = Math.max(1, contentSize.height - layoutMeasurement.height);
    queueProgress(Math.min(1, Math.max(0, contentOffset.y / scrollable)));
  }

  async function saveBookmark() {
    if (!chapter) return;
    try {
      await addBookmark.mutateAsync({
        storyId: chapter.story.id,
        chapterId: chapter.chapter.id,
        position: Math.round(currentProgress.current * 10_000),
        note: note.trim() || null,
      });
      setBookmarkOpen(false);
      setNote("");
      toast("Signet posé dans ce chapitre.", "success");
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  if (chapterQuery.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.nightDeep }}>
        <LoadingState label="Ouverture du chapitre…" />
      </SafeAreaView>
    );
  }

  if (chapterQuery.isError || !chapter) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.nightDeep }}>
        <View style={styles.errorHeader}>
          <IconButton icon="chevron-back" label="Retour" tone="plain" onPress={() => router.back()} />
        </View>
        <ErrorState
          message={errorMessage(chapterQuery.error)}
          onRetry={() => void chapterQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const paletteForReading = getReadingTheme(readingTheme);
  const index = chapter.siblings.findIndex((sibling) => sibling.id === chapter.chapter.id);
  const previous = index > 0 ? chapter.siblings[index - 1] : undefined;
  const next = index >= 0 && index < chapter.siblings.length - 1 ? chapter.siblings[index + 1] : undefined;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: paletteForReading.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" label="Retour" tone="plain" onPress={() => router.back()} />
        <View style={styles.topText}>
          <Text
            variant="caption"
            color={paletteForReading.textMuted}
            numberOfLines={1}
          >
            {chapter.story.title}
          </Text>
          <Text
            variant="bodyStrong"
            color={paletteForReading.text}
            numberOfLines={1}
            style={styles.chapterName}
          >
            {chapter.chapter.title}
          </Text>
        </View>
        <IconButton
          icon="bookmark-outline"
          label="Poser un signet"
          tone="plain"
          onPress={() => setBookmarkOpen(true)}
        />
        <IconButton
          icon="text-outline"
          label="Réglages de lecture"
          tone="plain"
          onPress={() => setSettingsOpen(true)}
        />
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(progress * 100)}%`, backgroundColor: paletteForReading.accent },
          ]}
        />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={120}
        showsVerticalScrollIndicator={false}
      >
        <Text
          variant="label"
          color={paletteForReading.accent}
          align="center"
          style={styles.eyebrow}
        >
          {chapter.authorName} · chapitre {index + 1} sur {chapter.siblings.length}
        </Text>
        <Text
          variant="display"
          color={paletteForReading.text}
          align="center"
          style={styles.title}
        >
          {chapter.chapter.title}
        </Text>
        <View style={styles.ornament}>
          <View style={[styles.line, { backgroundColor: paletteForReading.accent }]} />
          <View style={[styles.diamond, { backgroundColor: paletteForReading.accent }]} />
          <View style={[styles.line, { backgroundColor: paletteForReading.accent }]} />
        </View>
        <Prose
          content={chapter.chapter.content}
          color={paletteForReading.text}
          mutedColor={paletteForReading.textMuted}
          baseSize={18}
        />

        <View style={styles.endMark}>
          <View style={[styles.line, { backgroundColor: paletteForReading.accent }]} />
          <Ionicons name="book-outline" size={18} color={paletteForReading.accent} />
          <View style={[styles.line, { backgroundColor: paletteForReading.accent }]} />
        </View>

        <ChapterEndSocial
          storyId={chapter.story.id}
          chapterId={chapter.chapter.id}
          colors={paletteForReading}
        />

        <View style={styles.navigation}>
          <Button
            label={previous ? "Chapitre précédent" : "Début du récit"}
            icon="arrow-back"
            variant="ghost"
            size="sm"
            disabled={!previous}
            onPress={() =>
              previous
                ? router.replace({ pathname: "/lecture/[id]", params: { id: previous.id } })
                : undefined
            }
          />
          <Button
            label={next ? "Chapitre suivant" : "Fin pour l'instant"}
            iconRight={next ? "arrow-forward" : undefined}
            size="sm"
            disabled={!next}
            onPress={() =>
              next
                ? router.replace({ pathname: "/lecture/[id]", params: { id: next.id } })
                : undefined
            }
          />
        </View>

        {chapter.isOwner ? (
          <Button
            label="Modifier ce chapitre"
            icon="create-outline"
            variant="secondary"
            size="sm"
            onPress={() =>
              router.push({ pathname: "/chapitre/[id]", params: { id: chapter.chapter.id } })
            }
            style={styles.ownerButton}
          />
        ) : null}

        <Text
          variant="caption"
          color={paletteForReading.textMuted}
          align="center"
          style={styles.wordCount}
        >
          {formatNumber(chapter.chapter.wordCount)} mots · lecture sauvegardée sur cet appareil et
          votre compte
        </Text>
      </ScrollView>

      <Sheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Confort de lecture"
        subtitle="Ces réglages s'appliquent à tous les textes et sont conservés sur l'appareil."
      >
        <View style={styles.settingGroup}>
          <Text variant="label" color={theme.textSecondary}>
            Ambiance
          </Text>
          <View style={styles.themeRow}>
            {(["night", "sepia", "ivory"] as const).map((themeId) => {
              const option = getReadingTheme(themeId);
              const selected = readingTheme === themeId;
              return (
                <Pressable
                  key={themeId}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Thème ${option.label}`}
                  onPress={() => setReadingTheme(themeId)}
                  style={[
                    styles.themeOption,
                    { backgroundColor: option.background, borderColor: option.accent },
                    selected && styles.themeSelected,
                  ]}
                >
                  <Text variant="bodyStrong" color={option.text}>
                    Aa
                  </Text>
                  <Text variant="caption" color={option.textMuted}>
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={16} color={option.accent} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.settingGroup}>
          <Text variant="label" color={theme.textSecondary}>
            Taille du texte
          </Text>
          <View style={styles.scaleRow}>
            {fontScaleOptions.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected: Math.abs(fontScale - option) < 0.01 }}
                accessibilityLabel={`Taille ${Math.round(option * 100)} pour cent`}
                onPress={() => setFontScale(option)}
                style={[
                  styles.scaleOption,
                  Math.abs(fontScale - option) < 0.01 && styles.scaleSelected,
                ]}
              >
                <Text
                  variant="caption"
                  color={
                    Math.abs(fontScale - option) < 0.01 ? palette.nightDeep : theme.textSecondary
                  }
                >
                  {Math.round(option * 100)} %
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <InlineNotice tone="info">
          La taille choisie s'applique aussi aux écrans de l'application. Les titres suivent la
          préférence de façon atténuée pour préserver la mise en page.
        </InlineNotice>
      </Sheet>

      <Sheet
        visible={bookmarkOpen}
        onClose={() => setBookmarkOpen(false)}
        title="Poser un signet"
        subtitle="Vous pourrez retrouver ce passage depuis votre profil."
        footer={
          <Button
            label="Garder ce passage"
            icon="bookmark"
            loading={addBookmark.isPending}
            onPress={() => void saveBookmark()}
          />
        }
      >
        <Card>
          <Text variant="caption" color={theme.textMuted}>
            Position actuelle
          </Text>
          <Text variant="title" color={theme.goldBright}>
            {Math.round(currentProgress.current * 100)} %
          </Text>
          <Text variant="caption" color={theme.textSecondary}>
            {chapter.chapter.title}
          </Text>
        </Card>
        <Input
          label="Note de lecture (facultative)"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
          placeholder="Ce que ce passage remue, ce qu'il annonce…"
          hint={`${note.length}/500`}
        />
        <InlineNotice tone="info">
          Un signet mémorise l'endroit, pas une copie du texte. Le manuscrit reste la propriété de
          son auteur.
        </InlineNotice>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  errorHeader: {
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 2,
  },
  topText: {
    flex: 1,
    paddingHorizontal: 4,
  },
  chapterName: {
    fontSize: 13,
  },
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(197,164,106,0.18)",
  },
  progressFill: {
    height: 2,
  },
  content: {
    paddingHorizontal: 26,
    paddingTop: spacing[6],
    paddingBottom: spacing[9],
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  eyebrow: {
    marginBottom: spacing[4],
  },
  title: {
    fontSize: 31,
    lineHeight: 38,
    textAlign: "center",
  },
  ornament: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: spacing[6],
    paddingHorizontal: 40,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
  diamond: {
    width: 5,
    height: 5,
    transform: [{ rotate: "45deg" }],
    opacity: 0.7,
  },
  endMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: spacing[8],
    marginBottom: spacing[6],
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing[2],
  },
  ownerButton: {
    marginTop: spacing[4],
    alignSelf: "center",
  },
  wordCount: {
    marginTop: spacing[5],
    fontSize: 10,
  },
  settingGroup: {
    gap: 9,
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeOption: {
    flex: 1,
    minHeight: 82,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 10,
    gap: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  themeSelected: {
    borderWidth: 2,
  },
  scaleRow: {
    flexDirection: "row",
    gap: 6,
  },
  scaleOption: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(197,164,106,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  scaleSelected: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
});
