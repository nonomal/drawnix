import Stack from '../stack';
import { BackgroundColorIcon, FontColorIcon, StrokeIcon } from '../icons';
import {
  ATTACHED_ELEMENT_CLASS_NAME,
  getSelectedElements,
  isDragging,
  isMovingElements,
  isSelectionMoving,
  Path,
  PlaitBoard,
  PlaitElement,
  SELECTION_RECTANGLE_BOUNDING_CLASS_NAME,
  SELECTION_RECTANGLE_CLASS_NAME,
  Transforms,
} from '@plait/core';
import React, { useEffect, useRef, useState } from 'react';
import { useBoard } from '@plait/react-board';
import { flip, offset, useFloating } from '@floating-ui/react';
import { Island } from '../island';
import classNames from 'classnames';
import { getStrokeByMindElement, MindElement } from '@plait/mind';
import './popup-toolbar.scss';
import {
  DrawTransforms,
  getMemorizeKey,
  getSelectedTableCellsEditor,
  getStrokeColorByElement,
  isDrawElementClosed,
  isDrawElementsIncludeText,
  PlaitDrawElement,
} from '@plait/draw';
import { CustomText, PropertyTransforms } from '@plait/common';
import {
  getTextMarksByElement,
  PlaitMarkEditor,
  TextTransforms,
} from '@plait/text-plugins';
import { PopupFontColorButton } from './font-color-button';
import { PopupStrokeButton } from './stroke-button';
import { PopupFillButton } from './fill-button';

export type PopupToolbarProps = {};

export const PopupToolbar: React.FC<PopupToolbarProps> = ({}) => {
  const board = useBoard();
  const selectedElements = getSelectedElements(board);
  const [movingOrDragging, setMovingOrDragging] = useState(false);
  const movingOrDraggingRef = useRef(movingOrDragging);
  const open = selectedElements.length > 0 && !isSelectionMoving(board);
  const { viewport, selection, children } = board;
  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    middleware: [offset(32), flip()],
  });
  let state: {
    fill: string | undefined;
    strokeColor?: string;
    hasFill?: boolean;
    fontColor?: string;
    hasFontColor?: boolean;
    marks?: Omit<CustomText, 'text'>;
  } = {
    fill: 'red',
  };
  if (open && !movingOrDragging) {
    const hasFill = selectedElements.some((value) =>
      hasFillProperty(board, value)
    );
    const hasText = selectedElements.some((value) =>
      hasTextProperty(board, value)
    );
    state = { ...getElementState(board), hasFill, hasFontColor: hasText };
  }
  useEffect(() => {
    if (open) {
      let selectionG = PlaitBoard.getBoardContainer(board).querySelector(
        `.${SELECTION_RECTANGLE_BOUNDING_CLASS_NAME}`
      );
      if (!selectionG) {
        selectionG = PlaitBoard.getBoardContainer(board).querySelector(
          `.${SELECTION_RECTANGLE_CLASS_NAME}`
        );
      }
      if (selectionG) {
        const rect = selectionG?.getBoundingClientRect();
        refs.setPositionReference({
          getBoundingClientRect() {
            return {
              width: rect.width,
              height: rect.height,
              x: rect.x,
              y: rect.y,
              top: rect.top,
              left: rect.left,
              right: rect.right,
              bottom: rect.bottom,
            };
          },
        });
      }
    }
  }, [viewport, selection, children, movingOrDragging]);

  useEffect(() => {
    movingOrDraggingRef.current = movingOrDragging;
  }, [movingOrDragging]);

  useEffect(() => {
    const { pointerUp, pointerMove } = board;

    board.pointerMove = (event: PointerEvent) => {
      if (
        (isMovingElements(board) || isDragging(board)) &&
        !movingOrDraggingRef.current
      ) {
        setMovingOrDragging(true);
      }
      pointerMove(event);
    };

    board.pointerUp = (event: PointerEvent) => {
      if (
        movingOrDraggingRef.current &&
        (isMovingElements(board) || isDragging(board))
      ) {
        setMovingOrDragging(false);
      }
      pointerUp(event);
    };

    return () => {
      board.pointerUp = pointerUp;
      board.pointerMove = pointerMove;
    };
  }, [board]);

  return (
    <>
      {open && !movingOrDragging && (
        <Island
          padding={1}
          className={classNames('popup-toolbar', ATTACHED_ELEMENT_CLASS_NAME)}
          ref={refs.setFloating}
          style={floatingStyles}
        >
          <Stack.Row gap={1}>
            {state.hasFontColor && (
              <PopupFontColorButton
                key={0}
                currentColor={state.fontColor}
                title={`Font Color`}
                fontColorIcon={
                  <FontColorIcon currentColor={state.marks?.color} />
                }
                onSelect={(selectedColor: string) => {
                  TextTransforms.setTextColor(
                    board,
                    selectedColor,
                    undefined,
                    getSelectedTableCellsEditor(board)
                  );
                }}
              ></PopupFontColorButton>
            )}
            <PopupStrokeButton
              key={1}
              currentColor={state.strokeColor}
              // currentOpacity={state}
              title={`Stroke`}
              transparentIcon={StrokeIcon}
              onColorSelect={(selectedColor: string) => {
                console.log(`selectedColor: ${selectedColor}`);
                PropertyTransforms.setStrokeColor(board, selectedColor, {
                  getMemorizeKey,
                });
              }}
            >
              <label
                className={classNames('stroke-label', 'color-label', {
                  'color-white': state.fill === '#FFFFFF',
                })}
                style={{ borderColor: state.strokeColor }}
              ></label>
            </PopupStrokeButton>
            {state.hasFill && (
              <PopupFillButton
                key={2}
                currentColor={state.fill}
                title={`Fill Color`}
                transparentIcon={BackgroundColorIcon}
                onColorSelect={(selectedColor: string) => {
                  PropertyTransforms.setFillColor(board, selectedColor, {
                    getMemorizeKey,
                    callback: (element: PlaitElement, path: Path) => {
                      const tableElement =
                        PlaitDrawElement.isElementByTable(element);
                      if (tableElement) {
                        DrawTransforms.setTableFill(
                          board,
                          element,
                          selectedColor,
                          path
                        );
                      } else {
                        if (isDrawElementClosed(element as PlaitDrawElement)) {
                          Transforms.setNode(
                            board,
                            { fill: selectedColor },
                            path
                          );
                        }
                      }
                    },
                  });
                }}
              >
                <label
                  className={classNames('fill-label', 'color-label', {
                    'color-white': state.fill === '#FFFFFF',
                  })}
                  style={{ backgroundColor: state.fill }}
                ></label>
              </PopupFillButton>
            )}
          </Stack.Row>
        </Island>
      )}
    </>
  );
};

export const getMindElementState = (
  board: PlaitBoard,
  element: MindElement
) => {
  const marks = getTextMarksByElement(element);
  return {
    fill: element.fill,
    strokeColor: getStrokeByMindElement(board, element),
    marks,
  };
};

export const getDrawElementState = (
  board: PlaitBoard,
  element: PlaitDrawElement
) => {
  let marks: Omit<CustomText, 'text'>;
  const selectedTableCellsEditor = getSelectedTableCellsEditor(board);
  if (selectedTableCellsEditor?.length) {
    const editor = selectedTableCellsEditor[0];
    marks = editor && PlaitMarkEditor.getMarks(editor);
  } else {
    marks = getTextMarksByElement(element);
  }
  return {
    fill: element.fill,
    strokeColor: getStrokeColorByElement(board, element),
    marks,
  };
};

export const getElementState = (board: PlaitBoard) => {
  const selectedElement = getSelectedElements(board)[0];
  if (MindElement.isMindElement(board, selectedElement)) {
    return getMindElementState(board, selectedElement);
  }
  return getDrawElementState(board, selectedElement as PlaitDrawElement);
};

export const hasFillProperty = (board: PlaitBoard, element: PlaitElement) => {
  if (MindElement.isMindElement(board, element)) {
    return true;
  }
  if (PlaitDrawElement.isDrawElement(element)) {
    return (
      PlaitDrawElement.isShapeElement(element) &&
      !PlaitDrawElement.isImage(element) &&
      !PlaitDrawElement.isText(element) &&
      isDrawElementClosed(element)
    );
  }
  return false;
};

export const hasTextProperty = (board: PlaitBoard, element: PlaitElement) => {
  if (MindElement.isMindElement(board, element)) {
    return true;
  }
  if (PlaitDrawElement.isDrawElement(element)) {
    return isDrawElementsIncludeText([element]);
  }
  return false;
};