import { useState } from 'react';
import axios from 'axios';
import {
  Download,
  Link as LinkIcon,
  Music,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Youtube,
  Github,
  Linkedin,
  Twitter,
  Mail,
  Sun,
  Moon
} from 'lucide-react';
import {
  Container,
  Flex,
  Box,
  Text,
  Heading,
  Button,
  TextField,
  Card,
  Grid,
  Badge,
  Callout,
  Theme,
  IconButton
} from '@radix-ui/themes';
import { LiveBackground } from './components/ui/background';
import { Dock, DockIcon } from './components/ui/dock';

interface VideoMetadata {
  title: string;
  thumbnail: string;
  author: string;
  lengthSeconds: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const App = () => {
  const [appearance, setAppearance] = useState<'light' | 'dark'>('dark');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState('');

  const toggleAppearance = () => {
    setAppearance(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleFetchMetadata = async () => {
    if (!url) {
      setError('Please enter a link');
      return;
    }

    // Check if it's a valid YT URL
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!ytRegex.test(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    setError('');
    setMetadata(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/metadata?url=${encodeURIComponent(url)}`);
      setMetadata(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not fetch video details. YouTube might be blocking the request. Please try another video or refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!url) return;
    setDownloading(true);

    const downloadUrl = `${API_BASE_URL}/download?url=${encodeURIComponent(url)}`;
    window.location.href = downloadUrl;

    setTimeout(() => {
      setDownloading(false);
    }, 4000);
  };

  return (
    <Theme appearance={appearance} accentColor="gray" grayColor="slate" panelBackground="translucent">
      <Box position="relative" minHeight="100vh" style={{ overflow: 'hidden' }}>
        <LiveBackground appearance={appearance} />

        <Box position="absolute" top="4" right="4" style={{ zIndex: 10 }}>
          <IconButton
            variant="ghost"
            color="gray"
            size="3"
            onClick={toggleAppearance}
            style={{ borderRadius: '50%', cursor: 'pointer' }}
          >
            {appearance === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </IconButton>
        </Box>

        <Container size="2" px="4" py="9" style={{ position: 'relative', zIndex: 1 }}>
          <Flex direction="column" align="center" mt="8" mb="7" style={{ textAlign: 'center' }}>
            <Badge size="2" variant="outline" color="gray" radius="full" mb="5">
              <Flex align="center" gap="2">
                <Sparkles size={14} />
                THE ULTIMATE MP3 CONVERTER
              </Flex>
            </Badge>

            <Heading size="9" weight="bold" style={{ letterSpacing: '-0.02em', textTransform: 'uppercase' }} mb="4">
              AUDIO<Text style={{ color: "var(--gray-9)" }}>GENX</Text>
            </Heading>

            <Text size="4" color="gray" style={{ maxWidth: 450 }}>
              Extract high-fidelity MP3 audio from any YouTube video in seconds. Premium engineering. Zero cost.
            </Text>
          </Flex>

          <Card size="3" variant="surface" style={{ 
          backgroundColor: appearance === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(16px)', 
          border: '1px solid var(--gray-a4)',
          borderRadius: '24px'
        }}>
          <Flex direction="column" gap="4">
            <TextField.Root
              size="3"
              variant="surface"
              radius="large"
              style={{ 
                backgroundColor: appearance === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
                border: '1px solid var(--gray-a3)'
              }}
                placeholder="Paste your YouTube link here..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchMetadata()}
              >
                <TextField.Slot>
                  <Youtube size={20} color="var(--gray-11)" />
                </TextField.Slot>
              </TextField.Root>

              {error && (
                <Callout.Root color="red" variant="soft">
                  <Callout.Icon>
                    <AlertCircle size={18} />
                  </Callout.Icon>
                  <Callout.Text size="2" weight="bold">
                    {error}
                  </Callout.Text>
                </Callout.Root>
              )}

              <Button
                size="4"
                variant="solid"
                color="gray"
                highContrast
                onClick={handleFetchMetadata}
                disabled={loading || !url}
                style={{ height: 56, cursor: (loading || !url) ? 'not-allowed' : 'pointer' }}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Flex align="center" gap="2">
                    <LinkIcon size={20} />
                    <Text weight="bold" size="3">Analyze Video</Text>
                  </Flex>
                )}
              </Button>
            </Flex>
          </Card>

          {metadata && (
            <Box mt="6">
              <Card size="3" variant="surface" style={{ 
                backgroundColor: appearance === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)', 
                backdropFilter: 'blur(16px)', 
                border: '1px solid var(--gray-a4)',
                borderRadius: '24px'
              }}>
                <Flex gap="6" align="start" direction={{ initial: 'column', sm: 'row' }}>
                  <Box width={{ initial: '100%', sm: '240px' }} style={{ flexShrink: 0, position: 'relative', borderRadius: 'var(--radius-3)', overflow: 'hidden' }}>
                    <img src={metadata.thumbnail} alt={metadata.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    <Box style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.8)' }}>
                      <Text size="1" weight="bold" style={{ letterSpacing: '0.1em', display: 'block' }} align="center">PREVIEW READY</Text>
                    </Box>
                  </Box>

                  <Flex direction="column" gap="4" style={{ flexGrow: 1, width: '100%' }}>
                    <Box>
                      <Heading size="5" mb="1" style={{ lineHeight: 1.2 }}>{metadata.title}</Heading>
                      <Text size="2" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {metadata.author} • {Math.floor(parseInt(metadata.lengthSeconds) / 60)}:{(parseInt(metadata.lengthSeconds) % 60).toString().padStart(2, '0')}
                      </Text>
                    </Box>

                    <Button
                      size="4"
                      variant="outline"
                      color="gray"
                      highContrast
                      onClick={handleDownload}
                      disabled={downloading}
                      style={{ height: 56, width: '100%' }}
                    >
                      {downloading ? (
                        <Flex align="center" gap="2">
                          <Loader2 className="animate-spin" size={20} />
                          <Text weight="bold" size="3">Starting Stream...</Text>
                        </Flex>
                      ) : (
                        <Flex align="center" gap="2">
                          <Download size={20} />
                          <Text weight="bold" size="3">Capture Audio</Text>
                        </Flex>
                      )}
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            </Box>
          )}

          <Grid columns={{ initial: '1', sm: '3' }} gap="5" mt="9">
            {[
              { icon: Music, title: "Pure 320kbps", desc: "No compression loss. Hear every detail." },
              { icon: Sparkles, title: "Zero Filler", desc: "User-first design. No ads, no redirect maze." },
              { icon: CheckCircle2, title: "High Rel", desc: "Optimized server clusters for 24/7 uptime." }
            ].map((feature, i) => (
              <Card key={i} variant="surface" style={{ 
                backgroundColor: appearance === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.5)', 
                textAlign: 'center', 
                padding: 'var(--space-6)',
                borderRadius: '20px',
                border: '1px solid var(--gray-a3)'
              }}>
                <Flex direction="column" align="center" gap="4">
                  <Box style={{ padding: 12, borderRadius: 12, border: '1px solid var(--gray-5)', backgroundColor: 'var(--gray-3)' }}>
                    <feature.icon size={24} color="white" />
                  </Box>
                  <Box>
                    <Heading size="3" mb="1" style={{ textTransform: 'uppercase', fontStyle: 'italic' }}>{feature.title}</Heading>
                    <Text size="2" color="gray" weight="medium">{feature.desc}</Text>
                  </Box>
                </Flex>
              </Card>
            ))}
          </Grid>

          <Box mt="9" pt="7" style={{ borderTop: '1px solid var(--gray-4)', textAlign: 'center' }}>
            <Flex direction="column" gap="4" align="center">
              <Text size="2" weight="bold" style={{ letterSpacing: '0.15em', opacity: 0.8 }} color="gray">
                DESIGNED & ENGINEERED BY <Text style={{ color: 'white', opacity: 1 }}>VI•0650</Text>
              </Text>

              <Box mt="4">
                <Dock iconSize={40} iconMagnification={60} iconDistance={140}>
                  <DockIcon>
                    <a href="https://github.com/vi0650" target="_blank" rel="noopener noreferrer">
                      <Github size={24} color="var(--gray-12)" />
                    </a>
                  </DockIcon>
                  <DockIcon>
                    <a href="https://www.linkedin.com/in/vaibhav-padmani-669492240" target="_blank" rel="noopener noreferrer">
                      <Linkedin size={24} color="var(--gray-12)" />
                    </a>
                  </DockIcon>
                  <DockIcon>
                    <a href="https://x.com/vi_0650" target="_blank" rel="noopener noreferrer">
                      <Twitter size={24} color="var(--gray-12)" />
                    </a>
                  </DockIcon>
                  <DockIcon>
                    <a href="mailto:vi.vaibhavpadmani650@gmail.com">
                      <Mail size={24} color="var(--gray-12)" />
                    </a>
                  </DockIcon>
                </Dock>
              </Box>

              <Flex gap="6" mt="4">
                <Text size="1" weight="bold" color="gray" style={{ cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Privacy</Text>
                <Text size="1" weight="bold" color="gray" style={{ cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Terms</Text>
                <Text size="1" weight="bold" color="gray" style={{ cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Safety</Text>
              </Flex>
            </Flex>
            <Box pb="8" />
          </Box>
        </Container>
      </Box>
    </Theme>
  );
};

export default App;
