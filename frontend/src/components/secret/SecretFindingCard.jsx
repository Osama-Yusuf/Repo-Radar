import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Box, Chip, Grid,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Collapse,
    IconButton, Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CodeIcon from '@mui/icons-material/Code';
import WarningIcon from '@mui/icons-material/Warning';

/**
 * @component SecretFindingCard
 * @description A card component that displays information about secret findings for a project.
 * Users can view a summary of findings and expand to see detailed information.
 *
 * @param {object} props - The component's props.
 * @param {object} props.project - The project object containing details.
 * @param {array} props.findings - Array of secret findings for the project.
 */
const SecretFindingCard = ({ project, findings }) => {
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Group findings by file path
    const findingsByFile = findings.reduce((acc, finding) => {
        const filePath = finding.filePath || 'Unknown';
        if (!acc[filePath]) {
            acc[filePath] = [];
        }
        acc[filePath].push(finding);
        return acc;
    }, {});

    // Count total findings
    const totalFindings = findings.length;

    // Toggle details visibility
    const handleToggleDetails = () => {
        setDetailsOpen(!detailsOpen);
    };

    return (
        <Card sx={{
            mb: 3,
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            p: 0,
            transition: 'all 0.3s ease',
            '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            },
        }}>
            <CardContent sx={{ p: 3 }}>
                {/* Header Section */}
                <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Grid item xs>
                        <Typography
                            variant="h6"
                            component="div"
                            sx={{
                                fontWeight: 700,
                                color: '#fff',
                                mb: 0.5,
                                wordBreak: 'break-all',
                                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                fontSize: '1.25rem',
                                letterSpacing: '0.01em'
                            }}
                        >
                            {project.name}
                        </Typography>
                    </Grid>
                    <Grid item>
                        <Chip
                            icon={<WarningIcon />}
                            label={`${totalFindings} Secret${totalFindings !== 1 ? 's' : ''}`}
                            color="error"
                            variant="outlined"
                            sx={{
                                borderWidth: 2,
                                fontWeight: 'bold',
                                '& .MuiChip-icon': { color: 'inherit' }
                            }}
                        />
                    </Grid>
                </Grid>

                {/* Project Info */}
                <Box sx={{
                    p: 1.5,
                    mb: 2,
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    <Typography variant="body2" sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        mb: 0.5,
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <Box component="span" sx={{
                            minWidth: '80px',
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontWeight: 500
                        }}>
                            Repository:
                        </Box>
                        <Typography
                            component="span"
                            sx={{
                                color: '#fff',
                                fontFamily: 'monospace',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                wordBreak: 'break-all'
                            }}
                        >
                            {project.repo_url || 'N/A'}
                        </Typography>
                    </Typography>
                    <Typography variant="body2" sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <Box component="span" sx={{
                            minWidth: '80px',
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontWeight: 500
                        }}>
                            Files:&nbsp;&nbsp;
                        </Box>
                        <Typography
                            component="span"
                            sx={{
                                color: '#fff',
                                fontWeight: 500
                            }}
                        >
                            {Object.keys(findingsByFile).length} file(s) with secrets
                        </Typography>
                    </Typography>
                </Box>

                {/* Summary Section */}
                <Box sx={{ mb: 2 }}>
                    <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{
                            fontWeight: 600,
                            color: 'rgba(255, 255, 255, 0.9)',
                            mb: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            '&:before': {
                                content: '""',
                                display: 'inline-block',
                                width: '4px',
                                height: '18px',
                                backgroundColor: '#f44336',
                                marginRight: '8px',
                                borderRadius: '2px'
                            }
                        }}
                    >
                        <span>Secret Findings</span>
                        <Tooltip title={detailsOpen ? "Hide Details" : "Show Details"}>
                            <IconButton
                                onClick={handleToggleDetails}
                                size="small"
                                sx={{
                                    color: '#90caf9',
                                    '&:hover': {
                                        background: 'rgba(33, 150, 243, 0.2)'
                                    }
                                }}
                            >
                                {detailsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                        </Tooltip>
                    </Typography>

                    {/* File summary chips */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {Object.keys(findingsByFile).slice(0, 5).map((filePath) => (
                            <Chip
                                key={filePath}
                                icon={<CodeIcon />}
                                label={`${filePath} (${findingsByFile[filePath].length})`}
                                variant="outlined"
                                size="small"
                                sx={{
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                    '& .MuiChip-icon': {
                                        color: 'rgba(255, 255, 255, 0.7)'
                                    }
                                }}
                            />
                        ))}
                        {Object.keys(findingsByFile).length > 5 && (
                            <Chip
                                label={`+${Object.keys(findingsByFile).length - 5} more files`}
                                variant="outlined"
                                size="small"
                                sx={{
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    borderColor: 'rgba(255, 255, 255, 0.2)'
                                }}
                            />
                        )}
                    </Box>
                </Box>

                {/* Detailed Findings Table */}
                <Collapse in={detailsOpen} timeout="auto" unmountOnExit>
                    <TableContainer component={Paper} sx={{
                        maxHeight: '400px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        '& .MuiTableCell-root': {
                            borderColor: 'rgba(255, 255, 255, 0.1)'
                        }
                    }}>
                        <Table stickyHeader aria-label="secret findings table" size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontWeight: 'bold'
                                    }}>File Path</TableCell>
                                    <TableCell align="right" sx={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontWeight: 'bold'
                                    }}>Line</TableCell>
                                    <TableCell sx={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontWeight: 'bold'
                                    }}>Description</TableCell>
                                    <TableCell sx={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontWeight: 'bold'
                                    }}>Secret</TableCell>
                                    <TableCell sx={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontWeight: 'bold'
                                    }}>Author</TableCell>
                                    <TableCell sx={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontWeight: 'bold'
                                    }}>Rule ID</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {findings.map((finding) => (
                                    <TableRow hover key={finding.id} sx={{
                                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' }
                                    }}>
                                        <TableCell sx={{
                                            color: 'rgba(255, 255, 255, 0.9)',
                                            wordBreak: 'break-all'
                                        }}>{finding.filePath}</TableCell>
                                        <TableCell align="right" sx={{
                                            color: 'rgba(255, 255, 255, 0.9)'
                                        }}>{finding.lineNumber}</TableCell>
                                        <TableCell sx={{
                                            color: 'rgba(255, 255, 255, 0.9)'
                                        }}>{finding.description}</TableCell>
                                        <TableCell sx={{
                                            color: 'rgba(255, 255, 255, 0.9)',
                                            wordBreak: 'break-all',
                                            whiteSpace: 'pre-wrap',
                                            fontFamily: 'monospace',
                                            fontSize: '0.8rem'
                                        }}>{finding.secret}</TableCell>
                                        <TableCell sx={{
                                            color: 'rgba(255, 255, 255, 0.9)'
                                        }}>{finding.author}</TableCell>
                                        <TableCell sx={{
                                            color: 'rgba(255, 255, 255, 0.9)'
                                        }}>{finding.ruleId}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Collapse>
            </CardContent>
        </Card>
    );
};

export default SecretFindingCard;
